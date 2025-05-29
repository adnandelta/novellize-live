import { NextResponse } from 'next/server';

const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
const MAX_CHUNK_SIZE = 400000; // ~400KB per chunk, well below Redis limits

async function redisRequest(endpoint: string, options: RequestInit = {}) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis credentials are not configured');
  }

  try {
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    const response = await fetch(`${REDIS_URL}${formattedEndpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Redis error response:', data);
      throw new Error(`Redis request failed: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error('Redis request failed:', {
      endpoint,
      error: error instanceof Error ? error.message : error,
      url: REDIS_URL,
      hasToken: !!REDIS_TOKEN,
      headers: options.headers,
    });
    throw error;
  }
}

// Function to split data into chunks
function chunkData(data: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  let index = 0;
  
  while (index < data.length) {
    chunks.push(data.slice(index, index + maxChunkSize));
    index += maxChunkSize;
  }
  
  return chunks;
}

// Reassemble chunks into the original data
async function reassembleChunks(baseKey: string): Promise<string | null> {
  try {
    // Get the chunk info first
    const infoResult = await redisRequest(`/get/${baseKey}:info`);
    if (!infoResult?.result) return null;
    
    const info = JSON.parse(infoResult.result);
    if (!info.chunks || !info.totalLength) return null;
    
    let completeData = '';
    for (let i = 0; i < info.chunks; i++) {
      const chunkResult = await redisRequest(`/get/${baseKey}:chunk:${i}`);
      if (!chunkResult?.result) {
        console.error(`Missing chunk ${i} for key ${baseKey}`);
        return null;
      }
      completeData += chunkResult.result;
    }
    
    // Verify we got all the data
    if (completeData.length !== info.totalLength) {
      console.error(`Data length mismatch: ${completeData.length} vs expected ${info.totalLength}`);
      return null;
    }
    
    return completeData;
  } catch (error) {
    console.error('Error reassembling chunks:', error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    console.log('Fetching from Redis, key:', key);
    
    // First check if this is a chunked value
    const infoKey = `${key}:info`;
    const infoResult = await redisRequest(`/get/${infoKey}`);
    
    if (infoResult?.result) {
      // This is a chunked value, reassemble it
      console.log('Chunked data detected, reassembling...');
      const reassembledData = await reassembleChunks(key);
      
      if (reassembledData) {
        try {
          // Try to parse as JSON if possible
          const parsedData = JSON.parse(reassembledData);
          return NextResponse.json({ data: parsedData });
        } catch (e) {
          // Return as string if not JSON
          return NextResponse.json({ data: reassembledData });
        }
      } else {
        return NextResponse.json({ error: 'Failed to reassemble chunked data' }, { status: 500 });
      }
    }
    
    // Regular non-chunked key
    const result = await redisRequest(`/get/${key}`);
    console.log('Redis response:', result?.result ? 'Data found' : 'No data found');
    
    return NextResponse.json({ data: result?.result });
  } catch (error) {
    console.error('Redis GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data', details: error }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value, ttl } = body;
    
    console.log('Received POST request:', {
      key,
      valueType: typeof value,
      valueLength: typeof value === 'string' ? value.length : JSON.stringify(value).length,
      ttl
    });
    
    if (!key || value === undefined) {
      return NextResponse.json({ 
        error: 'Key and value are required',
        receivedKey: key,
        receivedValue: typeof value 
      }, { status: 400 });
    }

    // Convert value to string if it's an object
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
    
    // If the value is large, chunk it
    if (stringValue.length > MAX_CHUNK_SIZE) {
      console.log(`Large value detected (${stringValue.length} bytes), chunking data...`);
      const chunks = chunkData(stringValue, MAX_CHUNK_SIZE);
      
      // Store info about the chunks
      const chunkInfo = {
        chunks: chunks.length,
        totalLength: stringValue.length,
        createdAt: new Date().toISOString()
      };
      
      await redisRequest(`/set/${key}:info/${encodeURIComponent(JSON.stringify(chunkInfo))}/ex/${ttl || 3600}`, {
        method: 'POST'
      });
      
      // Store each chunk
      const chunkPromises = chunks.map((chunk, index) => 
        redisRequest(`/set/${key}:chunk:${index}/${encodeURIComponent(chunk)}/ex/${ttl || 3600}`, {
          method: 'POST'
        })
      );
      
      await Promise.all(chunkPromises);
      
      console.log(`Successfully stored ${chunks.length} chunks for key ${key}`);
      
      return NextResponse.json({ 
        success: true,
        chunked: true,
        chunks: chunks.length
      });
    }
    
    // For smaller values, proceed normally
    console.log('Setting Redis key:', key, 'with TTL:', ttl);
    
    const endpoint = ttl ? 
      `/set/${encodeURIComponent(key)}/${encodeURIComponent(stringValue)}/ex/${ttl}` : 
      `/set/${encodeURIComponent(key)}/${encodeURIComponent(stringValue)}`;
    
    try {
      const setResult = await redisRequest(endpoint, {
        method: 'POST'
      });
      
      console.log('Redis SET response:', setResult);
      
      return NextResponse.json({ 
        success: true,
        chunked: false
      });
    } catch (redisError) {
      console.error('Redis operation failed:', redisError);
      return NextResponse.json({ 
        error: 'Redis operation failed',
        details: redisError instanceof Error ? redisError.message : redisError
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
} 