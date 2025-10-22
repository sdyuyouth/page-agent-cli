/**
 * js 语法高亮组件，适合在文章中演示代码片段
 */
import React from 'react'

import styles from './HighlightSyntax.module.css'

interface HighlightSyntaxProps {
	code: string
}

const keywords =
	'async|await|function|const|let|var|if|else|for|while|return|try|catch|finally|class|extends|from|import|export|default|undefined|throw|true|false|null|this|new|in|of|instanceof|break|continue|switch|case|default|do|while|with|yield'

// 语法高亮函数，先整体提取字符串/注释等token再高亮
function highlightSyntax(code: string): string {
	// 先转义HTML特殊字符
	const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

	// 单行字符串，所有反斜杠双重转义，保证正则安全
	const pattern = new RegExp(
		'("([^"\\\\]|\\\\.)*"|\'([^\'\\\\]|\\\\.)*\'|`([^`\\\\]|\\\\.)*`|//[^\\n]*|/\\*[\\s\\S]*?\\*/|\\b\\d+\\.?\\d*\\b|\\b(?:' +
			keywords +
			')\\b)',
		'g'
	)

	const tokens: string[] = []
	let lastIndex = 0
	let match: RegExpExecArray | null
	while ((match = pattern.exec(escaped)) !== null) {
		if (match.index > lastIndex) {
			tokens.push(...escaped.slice(lastIndex, match.index).split(/([ \t\n\r.])/))
		}
		tokens.push(match[0])
		lastIndex = pattern.lastIndex
	}
	if (lastIndex < escaped.length) {
		tokens.push(...escaped.slice(lastIndex).split(/([ \t\n\r.])/))
	}

	const highlighted = tokens
		.map((token) => {
			if (
				/^"([^"\\]|\\.)*"$/.test(token) ||
				/^'([^'\\]|\\.)*'$/.test(token) ||
				/^`([^`\\]|\\.)*`$/.test(token)
			) {
				return `<span class="${styles.string}">${token}</span>`
			}
			if (/^\b\d+\.?\d*\b$/.test(token)) {
				return `<span class="${styles.number}">${token}</span>`
			}
			if (/^\/\/.*$/.test(token)) {
				return `<span class="${styles.comment}">${token}</span>`
			}
			if (/^\/\*[\s\S]*?\*\/$/.test(token)) {
				return `<span class="${styles.comment}">${token}</span>`
			}
			if (new RegExp(`\\b(?:${keywords})\\b`).test(token)) {
				return `<span class="${styles.keyword}">${token}</span>`
			}
			return token
		})
		.join('')

	return highlighted
}

const HighlightSyntaxClient: React.FC<HighlightSyntaxProps> = ({ code }) => {
	const htmlContent = highlightSyntax(code)

	// eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
	return <code className={styles.syntax} dangerouslySetInnerHTML={{ __html: htmlContent }} />
}

export default HighlightSyntaxClient
