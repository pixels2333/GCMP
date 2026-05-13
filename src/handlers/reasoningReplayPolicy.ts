import type { ModelConfig } from '../types/sharedTypes';

export type MissingReasoningFieldPolicy = 'never' | 'tool-calls-only' | 'always';

export interface ReasoningReplayPolicy {
    restoreFromStatefulMarker: boolean;
    missingReasoningFieldPolicy: MissingReasoningFieldPolicy;
}

interface ReasoningReplayContext {
    providerKey?: string;
    modelConfig?: Partial<Pick<ModelConfig, 'baseUrl' | 'id' | 'model' | 'provider'>>;
}

export function getReasoningReplayPolicy(context: ReasoningReplayContext): ReasoningReplayPolicy {
    const providerKey = `${context.modelConfig?.provider || context.providerKey || ''}`.toLowerCase();
    const modelId = `${context.modelConfig?.model || context.modelConfig?.id || ''}`.toLowerCase();
    const baseUrl = `${context.modelConfig?.baseUrl || ''}`.toLowerCase();

    if (modelId.includes('deepseek-v4')) {
        return {
            restoreFromStatefulMarker: true,
            missingReasoningFieldPolicy: 'always'
        };
    }

    if (isMiMoReasoningModel(providerKey, modelId, baseUrl)) {
        return {
            restoreFromStatefulMarker: true,
            missingReasoningFieldPolicy: 'tool-calls-only'
        };
    }

    return {
        restoreFromStatefulMarker: false,
        missingReasoningFieldPolicy: 'never'
    };
}

export function shouldInjectReasoningPlaceholder(
    policy: ReasoningReplayPolicy,
    hasToolCalls: boolean,
    markerHasToolCalls?: boolean
): boolean {
    if (policy.missingReasoningFieldPolicy === 'always') {
        return true;
    }

    if (policy.missingReasoningFieldPolicy === 'tool-calls-only') {
        return hasToolCalls || markerHasToolCalls === true;
    }

    return false;
}

function isMiMoReasoningModel(providerKey: string, modelId: string, baseUrl: string): boolean {
    return (
        providerKey === 'xiaomimimo' ||
        providerKey === 'xiaomimimo-token' ||
        modelId.startsWith('mimo-') ||
        modelId.includes('mimo-v') ||
        baseUrl.includes('xiaomimimo.com')
    );
}
