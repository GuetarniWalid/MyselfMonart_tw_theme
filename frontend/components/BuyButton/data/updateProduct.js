export async function updateProduct(product) {
  const serverUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3333'
      : 'https://backend.myselfmonart.com';
  const response = await fetch(serverUrl + '/api/product/update/painting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  const json = await response.json();
  return json;
}
