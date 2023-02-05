import type * as ts from 'typescript/lib/tsserverlibrary';
import * as vscode from 'vscode-languageserver-protocol';
import * as previewer from '../utils/previewer';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { LanguageServicePluginContext } from '@volar/language-service';

export function register(
	languageService: ts.LanguageService,
	getTextDocument: (uri: string) => TextDocument | undefined,
	ctx: LanguageServicePluginContext,
) {
	const ts = ctx.typescript!.module;

	return (uri: string, position: vscode.Position, documentOnly = false): vscode.Hover | undefined => {
		const document = getTextDocument(uri);
		if (!document) return;

		const fileName = ctx.uriToFileName(document.uri);
		const offset = document.offsetAt(position);

		let info: ReturnType<typeof languageService.getQuickInfoAtPosition> | undefined;
		try { info = languageService.getQuickInfoAtPosition(fileName, offset); } catch { }
		if (!info) return;

		const parts: string[] = [];
		const displayString = ts.displayPartsToString(info.displayParts);
		const documentation = previewer.markdownDocumentation(info.documentation ?? [], info.tags, { toResource }, getTextDocument, ctx);

		if (displayString && !documentOnly) {
			parts.push(['```typescript', displayString, '```'].join('\n'));
		}
		if (documentation) {
			parts.push(documentation);
		}

		const markdown: vscode.MarkupContent = {
			kind: vscode.MarkupKind.Markdown,
			value: parts.join('\n\n'),
		};

		return {
			contents: markdown,
			range: vscode.Range.create(
				document.positionAt(info.textSpan.start),
				document.positionAt(info.textSpan.start + info.textSpan.length),
			),
		};

		function toResource(path: string) {
			return ctx.fileNameToUri(path);
		}
	};
}
