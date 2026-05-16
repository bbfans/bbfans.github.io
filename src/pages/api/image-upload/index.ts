export const prerender = false;

export async function PATCH(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = `blog-images/${Date.now()}-${file.name}`;
  const bytes = await file.arrayBuffer();

  // Access the R2 bucket binding
  const bucket = (globalThis as any).BLOG_IMAGES;
  await bucket.put(key, bytes);

  const url = `https://img.1001020.xyz/${key}`;
  return new Response(JSON.stringify({ url }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
