import type { LLMConfig } from '@page-agent/llms'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { DEMO_API_KEY, DEMO_BASE_URL, DEMO_MODEL } from '@/agent/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ConfigPanelProps {
	config: LLMConfig | null
	onSave: (config: LLMConfig) => Promise<void>
	onClose: () => void
}

export function ConfigPanel({ config, onSave, onClose }: ConfigPanelProps) {
	const [apiKey, setApiKey] = useState(config?.apiKey || DEMO_API_KEY)
	const [baseURL, setBaseURL] = useState(config?.baseURL || DEMO_BASE_URL)
	const [model, setModel] = useState(config?.model || DEMO_MODEL)
	const [saving, setSaving] = useState(false)

	// Update local state when config prop changes
	useEffect(() => {
		setApiKey(config?.apiKey || DEMO_API_KEY)
		setBaseURL(config?.baseURL || DEMO_BASE_URL)
		setModel(config?.model || DEMO_MODEL)
	}, [config])

	const handleSave = async () => {
		setSaving(true)
		try {
			await onSave({ apiKey, baseURL, model })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<h2 className="text-base font-semibold">Settings</h2>

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

			<div className="flex flex-col gap-1.5">
				<label className="text-xs text-muted-foreground">API Key</label>
				<Input
					type="password"
					placeholder="sk-..."
					value={apiKey}
					onChange={(e) => setApiKey(e.target.value)}
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
