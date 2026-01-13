// @ts-nocheck
/**
 * Full CDN build for page-agent
 * Exposes PageAgent class for manual instantiation and configuration
 *
 * Usage:
 *   <script src="https://unpkg.com/@page-agent/cdn/dist/page-agent.js"></script>
 *   <script>
 *     const agent = new PageAgent({ model: 'gpt-4o', apiKey: 'your-key' })
 *     agent.panel.show()
 *   </script>
 */
import { PageAgent } from 'page-agent'

export { PageAgent }
