import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { agentCommands } from '@/messaging'

// Configuration panel component
export function ConfigPanel({ onClose }: { onClose: () => void }) {
	const [apiKey, setApiKey] = useState(DEMO_API_KEY)
	const [baseURL, setBaseURL] = useState(DEMO_BASE_URL)
	const [model, setModel] = useState(DEMO_MODEL)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		chrome.storage.local.get('llmConfig').then((result) => {
			const config = result.llmConfig as
				| { apiKey?: string; baseURL?: string; model?: string }
				| undefined
			if (config) {
				setApiKey(config.apiKey || DEMO_API_KEY)
				setBaseURL(config.baseURL || DEMO_BASE_URL)
				setModel(config.model || DEMO_MODEL)
			}
		})
	}, [])

	const handleSave = async () => {
		setSaving(true)
		try {
			await agentCommands.sendMessage('agent:configure', { apiKey, baseURL, model })
			onClose()
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<h2 className="text-base font-semibold">Settings</h2>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">API Key</label>
				<Input
					type="text"
					placeholder="sk-..."
					value={apiKey}
					onChange={(e) => setApiKey(e.target.value)}
					className="text-xs h-8"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">Base URL</label>
				<Input
					placeholder="https://api.openai.com/v1"
					value={baseURL}
					onChange={(e) => setBaseURL(e.target.value)}
					className="text-xs h-8"
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">Model</label>
				<Input
					placeholder="gpt-4o"
					value={model}
					onChange={(e) => setModel(e.target.value)}
					className="text-xs h-8"
				/>
			</div>

			<div className="flex gap-2 mt-2">
				<Button variant="outline" onClick={onClose} className="flex-1 h-8 text-xs">
					Cancel
				</Button>
				<Button onClick={handleSave} disabled={saving} className="flex-1 h-8 text-xs">
					{saving ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
				</Button>
			</div>
		</div>
	)
}
