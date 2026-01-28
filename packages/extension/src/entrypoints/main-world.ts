export default defineUnlistedScript(() => {
	const w = window as any

	let _lastId = 0
	function getId() {
		_lastId += 1
		return _lastId
	}

	w.execute = async (task: string) => {
		const id = getId()

		const promise = new Promise((resolve) => {
			function handleMessage(e: MessageEvent) {
				const data = e.data
				if (typeof data !== 'object' || data === null) return
				if (data.channel !== 'PAGE_AGENT_EXT_RESPONSE') return
				if (data.action !== 'execute_result') return
				if (data.id !== id) return

				window.removeEventListener('message', handleMessage)
				resolve(data.payload)
			}

			window.addEventListener('message', handleMessage)
		})

		window.postMessage(
			{
				channel: 'PAGE_AGENT_EXT_REQUEST',
				id,
				action: 'execute',
				payload: task,
			},
			'*'
		)

		return promise
	}

	w.dispose = () => {
		const id = getId()

		window.postMessage(
			{
				channel: 'PAGE_AGENT_EXT_REQUEST',
				id,
				action: 'dispose',
			},
			'*'
		)
	}
})
