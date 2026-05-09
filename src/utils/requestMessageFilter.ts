const EMPTY_FENCED_CODE_BLOCK_PATTERN = /```[^\S\r\n]*[^\r\n]*\r?\n(?:[ \t]*\r?\n)*[ \t]*```/g;
const USER_ROLE = 1;
const ASSISTANT_ROLE = 2;

export interface ChatMessageLike {
    role: number;
    content?: readonly unknown[];
}

interface TextLikePart {
    value: string | readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isTextLikePart(part: unknown): part is TextLikePart {
    if (!isRecord(part) || !('value' in part)) {
        return false;
    }

    const value = part.value;
    return typeof value === 'string' || (Array.isArray(value) && value.every(item => typeof item === 'string'));
}

function isToolCallLikePart(part: unknown): boolean {
    return isRecord(part) && typeof part.name === 'string' && 'input' in part;
}

function isToolResultLikePart(part: unknown): boolean {
    return isRecord(part) && typeof part.callId === 'string' && Array.isArray(part.content);
}

function isDataLikePart(part: unknown): boolean {
    return isRecord(part) && typeof part.mimeType === 'string' && 'data' in part;
}

function normalizeTextLikeValue(value: string | readonly string[]): string {
    const combined = typeof value === 'string' ? value : value.join('');
    return combined.replace(EMPTY_FENCED_CODE_BLOCK_PATTERN, '').trim();
}

function isToolResultOnlyUserMessage(message: ChatMessageLike): boolean {
    if (message.role !== USER_ROLE) {
        return false;
    }

    const content = message.content ?? [];
    if (content.length === 0) {
        return false;
    }

    let sawToolResult = false;
    for (const part of content) {
        if (isToolResultLikePart(part)) {
            sawToolResult = true;
            continue;
        }

        if (isTextLikePart(part) && normalizeTextLikeValue(part.value) === '') {
            continue;
        }

        return false;
    }

    return sawToolResult;
}

export function isAbortResidualAssistantMessage(message: ChatMessageLike): boolean {
    if (message.role !== ASSISTANT_ROLE) {
        return false;
    }

    const content = message.content ?? [];
    if (content.length === 0) {
        return true;
    }

    let sawTextLikePart = false;
    for (const part of content) {
        if (isToolCallLikePart(part) || isToolResultLikePart(part) || isDataLikePart(part)) {
            return false;
        }

        if (!isTextLikePart(part)) {
            return false;
        }

        sawTextLikePart = true;
        if (normalizeTextLikeValue(part.value) !== '') {
            return false;
        }
    }

    return sawTextLikePart;
}

export function filterAbortedAssistantMessages<T extends ChatMessageLike>(messages: readonly T[]): T[] {
    const filteredIndexes = new Set<number>();

    for (let index = 0; index < messages.length; index++) {
        const message = messages[index];
        if (!isAbortResidualAssistantMessage(message)) {
            continue;
        }

        filteredIndexes.add(index);

        for (let previousIndex = index - 1; previousIndex >= 0; previousIndex--) {
            if (filteredIndexes.has(previousIndex)) {
                continue;
            }

            const previousMessage = messages[previousIndex];
            if (previousMessage.role !== USER_ROLE) {
                continue;
            }

            if (!isToolResultOnlyUserMessage(previousMessage)) {
                filteredIndexes.add(previousIndex);
            }

            break;
        }
    }

    return messages.filter((_, index) => !filteredIndexes.has(index));
}
