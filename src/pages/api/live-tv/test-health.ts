import type { NextApiRequest, NextApiResponse } from 'next'
import { createStremioUSATVService } from '@/lib/services/stremio-usa-tv-health'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const mode = (req.query.mode as string) || 'healthy'

  try {
    const service = createStremioUSATVService({
      useCache: true,
      cacheTimeout: 60_000,
      enableHealthMonitoring: true,
    })

    const start = Date.now()
    let networks: any[] = []

    if (mode === 'all') {
      networks = await service.getNetworksByCategory(undefined, true)
    } else if (mode === 'healthy') {
      networks = await service.getHealthyNetworksByCategory()
    } else {
      return res.status(400).json({ error: 'invalid mode', mode })
    }

    const durationMs = Date.now() - start

    res.status(200).json({
      mode,
      durationMs,
      count: networks.length,
      sample: networks.slice(0, 5).map(n => ({ id: n.id, name: n.name })),
    })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error', mode })
  }
}
