import type { PageAgent } from '@/PageAgent'
import type { I18n } from '@/i18n'
import { truncate } from '@/utils'
import type { EventBus } from '@/utils/bus'

import { type Step, UIState } from './UIState'

import styles from './Panel.module.css'

/**
 * Agent control panel
 */
export class Panel {
	#wrapper: HTMLElement
	#indicator: HTMLElement
	#statusText: HTMLElement
	#historySection: HTMLElement
	#expandButton: HTMLElement
	#pauseButton: HTMLElement
	#stopButton: HTMLElement
	#inputSection: HTMLElement
	#taskInput: HTMLInputElement
	#bus: EventBus

	#state = new UIState()
	#isExpanded = false
	#pageAgent: PageAgent
	#userAnswerResolver: ((input: string) => void) | null = null
	#isWaitingForUserAnswer: boolean = false

	get wrapper(): HTMLElement {
		return this.#wrapper
	}

	constructor(pageAgent: PageAgent) {
		this.#pageAgent = pageAgent
		this.#bus = pageAgent.bus
		this.#wrapper = this.#createWrapper()
		this.#indicator = this.#wrapper.querySelector(`.${styles.indicator}`)!
		this.#statusText = this.#wrapper.querySelector(`.${styles.statusText}`)!
		this.#historySection = this.#wrapper.querySelector(`.${styles.historySection}`)!
		this.#expandButton = this.#wrapper.querySelector(`.${styles.expandButton}`)!
		this.#pauseButton = this.#wrapper.querySelector(`.${styles.pauseButton}`)!
		this.#stopButton = this.#wrapper.querySelector(`.${styles.stopButton}`)!
		this.#inputSection = this.#wrapper.querySelector(`.${styles.inputSectionWrapper}`)!
		this.#taskInput = this.#wrapper.querySelector(`.${styles.taskInput}`)!

		this.#setupEventListeners()
		// this.#expand() // debug

		this.#showInputArea()

		this.#bus.on('panel:show', () => this.#show())
		this.#bus.on('panel:hide', () => this.#hide())
		this.#bus.on('panel:reset', () => this.#reset())
		this.#bus.on('panel:update', (stepData) => this.#update(stepData))
		this.#bus.on('panel:expand', () => this.#expand())
		this.#bus.on('panel:collapse', () => this.#collapse())
	}

	/**
	 * Ask for user input
	 */
	async askUser(question: string): Promise<string> {
		return new Promise((resolve) => {
			// Set `waiting for user answer` state
			this.#isWaitingForUserAnswer = true
			this.#userAnswerResolver = resolve

			// Update state to `running`
			this.#update({
				type: 'output',
				displayText: `询问: ${question}`,
			})

			// Expand history panel
			if (!this.#isExpanded) {
				this.#expand()
			}

			this.#showInputArea(this.#pageAgent.i18n.t('ui.panel.userAnswerPrompt'))
		})
	}

	/**
	 * Dispose panel
	 */
	dispose(): void {
		this.#isWaitingForUserAnswer = false
		this.wrapper.remove()
	}

	/**
	 * Update status
	 */
	async #update(stepData: Omit<Step, 'id' | 'stepNumber' | 'timestamp'>): Promise<void> {
		const step = this.#state.addStep(stepData)

		// Show animation if text changes
		const headerText = truncate(step.displayText, 20)
		if (this.#statusText.textContent !== headerText) {
			await this.#animateTextChange(headerText)
		}

		this.#updateStatusIndicator(step.type)
		this.#updateHistory()

		// Auto-expand history after task completion
		if (step.type === 'completed' || step.type === 'error') {
			if (!this.#isExpanded) {
				this.#expand()
			}
		}

		// Control input area display based on status
		if (this.#shouldShowInputArea()) {
			this.#showInputArea()
		} else {
			this.#hideInputArea()
		}
	}

	/**
	 * Show panel
	 */
	#show(): void {
		this.wrapper.style.display = 'block'
		// Force reflow to trigger animation
		void this.wrapper.offsetHeight
		this.wrapper.style.opacity = '1'
		this.wrapper.style.transform = 'translateX(-50%) translateY(0)'
	}

	/**
	 * 隐藏面板
	 */
	#hide(): void {
		this.wrapper.style.opacity = '0'
		this.wrapper.style.transform = 'translateX(-50%) translateY(20px)'
		this.wrapper.style.display = 'none'
	}

	/**
	 * 重置状态
	 */
	#reset(): void {
		this.#state.reset()
		this.#statusText.textContent = this.#pageAgent.i18n.t('ui.panel.ready')
		this.#updateStatusIndicator('thinking')
		this.#updateHistory()
		this.#collapse()
		// Reset pause state
		this.#pageAgent.paused = false
		this.#updatePauseButton()
		// Reset user input state
		this.#isWaitingForUserAnswer = false
		this.#userAnswerResolver = null
		// Show input area
		this.#showInputArea()
	}

	/**
	 * Toggle pause state
	 */
	#togglePause(): void {
		this.#pageAgent.paused = !this.#pageAgent.paused
		this.#updatePauseButton()

		// Update status display
		if (this.#pageAgent.paused) {
			this.#statusText.textContent = '暂停中，稍后'
			this.#updateStatusIndicator('thinking') // Use existing thinking state
		} else {
			this.#statusText.textContent = '继续执行'
			this.#updateStatusIndicator('tool_executing') // Restore to execution state
		}
	}

	/**
	 * 更新暂停按钮状态
	 */
	#updatePauseButton(): void {
		if (this.#pageAgent.paused) {
			this.#pauseButton.textContent = '▶'
			this.#pauseButton.title = '继续'
			this.#pauseButton.classList.add(styles.paused)
		} else {
			this.#pauseButton.textContent = '⏸︎'
			this.#pauseButton.title = '暂停'
			this.#pauseButton.classList.remove(styles.paused)
		}
	}

	/**
	 * 终止 Agent
	 */
	#stopAgent(): void {
		// Update status display
		this.#update({
			type: 'error',
			displayText: '任务已终止',
		})

		this.#pageAgent.dispose()
	}

	/**
	 * 提交任务
	 */
	#submitTask() {
		const input = this.#taskInput.value.trim()
		if (!input) return

		// Hide input area
		this.#hideInputArea()

		if (this.#isWaitingForUserAnswer) {
			// Handle user input mode
			this.#handleUserAnswer(input)
		} else {
			this.#pageAgent.execute(input)
		}
	}

	/**
	 * 处理用户回答
	 */
	#handleUserAnswer(input: string): void {
		// Add user input to history
		this.#update({
			type: 'input',
			displayText: `用户回答: ${input}`,
		})

		// Reset state
		this.#isWaitingForUserAnswer = false

		// Call resolver to return user input
		if (this.#userAnswerResolver) {
			this.#userAnswerResolver(input)
			this.#userAnswerResolver = null
		}
	}

	/**
	 * 显示输入区域
	 */
	#showInputArea(placeholder?: string): void {
		// Clear input field
		this.#taskInput.value = ''
		this.#taskInput.placeholder = placeholder || '输入新任务，详细描述步骤，回车提交'
		this.#inputSection.classList.remove(styles.hidden)
		// Focus on input field
		setTimeout(() => {
			this.#taskInput.focus()
		}, 100)
	}

	/**
	 * 隐藏输入区域
	 */
	#hideInputArea(): void {
		this.#inputSection.classList.add(styles.hidden)
	}

	/**
	 * 检查是否应该显示输入区域
	 */
	#shouldShowInputArea(): boolean {
		// Always show input area if waiting for user input
		if (this.#isWaitingForUserAnswer) return true

		const steps = this.#state.getAllSteps()
		if (steps.length === 0) {
			return true // Initial state
		}

		const lastStep = steps[steps.length - 1]
		return lastStep.type === 'completed' || lastStep.type === 'error'
	}

	#createWrapper(): HTMLElement {
		const wrapper = document.createElement('div')
		wrapper.id = 'page-agent-runtime_agent-panel'
		wrapper.className = `${styles.wrapper} ${styles.collapsed}`
		wrapper.setAttribute('data-browser-use-ignore', 'true')

		wrapper.innerHTML = `
			<div class="${styles.background}"></div>
			<div class="${styles.historySectionWrapper}">
				<div class="${styles.historySection}">
					${this.#createHistoryItem({
						id: 'placeholder',
						stepNumber: 0,
						timestamp: new Date(),
						type: 'thinking',
						displayText: '等待任务开始...',
					})}
				</div>
			</div>
			<div class="${styles.header}">
				<div class="${styles.statusSection}">
					<div class="${styles.indicator} ${styles.thinking}"></div>
					<div class="${styles.statusText}">准备就绪</div>
				</div>
				<div class="${styles.controls}">
					<button class="${styles.controlButton} ${styles.expandButton}" title="展开历史">
						▼
					</button>
					<button class="${styles.controlButton} ${styles.pauseButton}" title="暂停">
						⏸︎
					</button>
					<button class="${styles.controlButton} ${styles.stopButton}" title="终止">
						X
					</button>
				</div>
			</div>
			<div class="${styles.inputSectionWrapper} ${styles.hidden}">
				<div class="${styles.inputSection}">
					<input 
						type="text" 
						class="${styles.taskInput}" 
						maxlength="200"
					/>
				</div>
			</div>
		`

		document.body.appendChild(wrapper)
		return wrapper
	}

	#setupEventListeners(): void {
		// Click header area to expand/collapse
		const header = this.wrapper.querySelector(`.${styles.header}`)!
		header.addEventListener('click', (e) => {
			// Don't trigger expand/collapse if clicking on buttons
			if ((e.target as HTMLElement).closest(`.${styles.controlButton}`)) {
				return
			}
			this.#toggle()
		})

		// Expand button
		this.#expandButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#toggle()
		})

		// Pause/continue button
		this.#pauseButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#togglePause()
		})

		// Stop button
		this.#stopButton.addEventListener('click', (e) => {
			e.stopPropagation()
			this.#stopAgent()
		})

		// Submit on Enter key in input field
		this.#taskInput.addEventListener('keydown', (e) => {
			if (e.isComposing) return // Ignore IME composition keys
			if (e.key === 'Enter') {
				e.preventDefault()
				this.#submitTask()
			}
		})

		// Prevent input area click event bubbling
		this.#inputSection.addEventListener('click', (e) => {
			e.stopPropagation()
		})
	}

	#toggle(): void {
		if (this.#isExpanded) {
			this.#collapse()
		} else {
			this.#expand()
		}
	}

	#expand(): void {
		this.#isExpanded = true
		this.wrapper.classList.remove(styles.collapsed)
		this.wrapper.classList.add(styles.expanded)
		this.#expandButton.textContent = '▲'
	}

	#collapse(): void {
		this.#isExpanded = false
		this.wrapper.classList.remove(styles.expanded)
		this.wrapper.classList.add(styles.collapsed)
		this.#expandButton.textContent = '▼'
	}

	async #animateTextChange(newText: string): Promise<void> {
		return new Promise((resolve) => {
			// Fade out current text
			this.#statusText.classList.add(styles.fadeOut)

			setTimeout(() => {
				// Update text content
				this.#statusText.textContent = newText

				// Fade in new text
				this.#statusText.classList.remove(styles.fadeOut)
				this.#statusText.classList.add(styles.fadeIn)

				setTimeout(() => {
					this.#statusText.classList.remove(styles.fadeIn)
					resolve()
				}, 300)
			}, 150) // Half the duration of fade out animation
		})
	}

	#updateStatusIndicator(type: Step['type']): void {
		// Clear all status classes
		this.#indicator.className = styles.indicator

		// Add corresponding status class
		this.#indicator.classList.add(styles[type])
	}

	#updateHistory(): void {
		const steps = this.#state.getAllSteps()

		this.#historySection.innerHTML = steps
			.slice(-10) // Only show last 10 items
			.map((step) => this.#createHistoryItem(step))
			.join('')

		// Scroll to bottom to show latest records
		this.#scrollToBottom()
	}

	#scrollToBottom(): void {
		// Execute in next event loop to ensure DOM update completion
		setTimeout(() => {
			this.#historySection.scrollTop = this.#historySection.scrollHeight
		}, 0)
	}

	#createHistoryItem(step: Step): string {
		const time = step.timestamp.toLocaleTimeString('zh-CN', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		})

		let typeClass = ''
		let statusIcon = ''

		// Set styles and icons based on step type
		if (step.type === 'completed') {
			// Check if this is a result from done tool
			if (step.toolName === 'done') {
				// @todo not right
				// Judge success or failure based on result
				const isSuccess =
					!step.toolResult ||
					(!step.toolResult.includes('失败') && !step.toolResult.includes('错误'))
				typeClass = isSuccess ? styles.doneSuccess : styles.doneError
				statusIcon = isSuccess ? '🎉' : '❌'
			} else {
				typeClass = styles.completed
				statusIcon = '✅'
			}
		} else if (step.type === 'error') {
			typeClass = styles.error
			statusIcon = '❌'
		} else if (step.type === 'tool_executing') {
			statusIcon = '⚙️'
		} else if (step.type === 'output') {
			typeClass = styles.output
			statusIcon = '🤖'
		} else if (step.type === 'input') {
			typeClass = styles.input
			statusIcon = '🎯'
		} else if (step.type === 'retry') {
			typeClass = styles.retry
			statusIcon = '🔄'
		} else {
			statusIcon = '🧠'
		}

		return `
			<div class="${styles.historyItem} ${typeClass}">
				<div class="${styles.historyContent}">
					<span class="${styles.statusIcon}">${statusIcon}</span>
					<span>${step.displayText}</span>
				</div>
				<div class="${styles.historyMeta}">
					步骤 ${step.stepNumber} · ${time}
					${step.duration ? ` · ${step.duration}ms` : ''}
				</div>
			</div>
		`
	}
}

/**
 * 获取工具执行时的显示文本
 */
export function getToolExecutingText(toolName: string, args: any, i18n: I18n): string {
	switch (toolName) {
		case 'click_element_by_index':
			return i18n.t('ui.tools.clicking', { index: args.index })
		case 'input_text':
			return i18n.t('ui.tools.inputting', { index: args.index })
		case 'select_dropdown_option':
			return i18n.t('ui.tools.selecting', { text: args.text })
		case 'scroll':
			return i18n.t('ui.tools.scrolling')
		case 'wait':
			return i18n.t('ui.tools.waiting', { seconds: args.seconds })
		case 'done':
			return i18n.t('ui.tools.done')
		default:
			return i18n.t('ui.tools.executing', { toolName })
	}
}

/**
 * 获取工具完成时的显示文本
 */
export function getToolCompletedText(toolName: string, args: any, i18n: I18n): string | null {
	switch (toolName) {
		case 'click_element_by_index':
			return i18n.t('ui.tools.clicked', { index: args.index })
		case 'input_text':
			return i18n.t('ui.tools.inputted', { text: args.text })
		case 'select_dropdown_option':
			return i18n.t('ui.tools.selected', { text: args.text })
		case 'scroll':
			return i18n.t('ui.tools.scrolled')
		case 'wait':
			return i18n.t('ui.tools.waited')
		case 'done':
			return null
		default:
			return null
	}
}
