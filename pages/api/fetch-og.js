// pages/api/fetch-og.js
// Call this with ?url=https://... to get the og:image from any page
// Used by the admin to auto-populate thumbnails

export default async function handler(req, res) {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'No URL provided' })

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NuDex/1.0; +https://nudex.com)',
      },
    })

    const html = await response.text()

    // Extract og:image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)

    // Extract og:title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)

    // Extract og:description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)

    const image = ogImageMatch ? ogImageMatch[1] : null
    const title = ogTitleMatch ? ogTitleMatch[1] : null
    const description = ogDescMatch ? ogDescMatch[1] : null

    return res.status(200).json({ image, title, description })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch URL', details: err.message })
  }
}
