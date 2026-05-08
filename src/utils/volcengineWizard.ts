/*---------------------------------------------------------------------------------------------
 *  Volcengine (火山方舟) 配置向导
 *  提供交互式向导来配置 Coding Plan 密钥和 Agent Plan 专用密钥
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Logger } from './logger';
import { ApiKeyManager } from './apiKeyManager';

export class VolcengineWizard {
    private static readonly PROVIDER_KEY = 'volcengine';
    private static readonly AGENT_PLAN_KEY = 'volcengine-agent';

    /**
     * 启动火山方舟配置向导
     */
    static async startWizard(displayName: string, apiKeyTemplate: string, tokenKeyTemplate?: string): Promise<void> {
        try {
            const choice = await vscode.window.showQuickPick(
                [
                    {
                        label: '$(key) 设置 Coding Plan API 密钥',
                        detail: `用于 ${displayName} Coding Plan 模型 或 按量计费 模型`,
                        value: 'coding'
                    },
                    {
                        label: '$(key) 设置 Agent Plan 专用密钥',
                        detail: `用于 ${displayName} Agent Plan 模型（专属API Key）`,
                        value: 'agentPlan'
                    },
                    {
                        label: '$(check-all) 依次配置全部项目',
                        detail: '按顺序配置 Coding Plan 密钥与 Agent Plan 专用密钥',
                        value: 'all'
                    }
                ],
                { title: `${displayName} 密钥配置`, placeHolder: '请选择要配置的项目' }
            );

            if (!choice) {
                Logger.debug('用户取消了火山方舟配置向导');
                return;
            }

            if (choice.value === 'coding' || choice.value === 'all') {
                await this.setCodingPlanApiKey(displayName, apiKeyTemplate);
            }

            if (choice.value === 'agentPlan' || choice.value === 'all') {
                await this.setAgentPlanApiKey(displayName, tokenKeyTemplate || apiKeyTemplate);
            }
        } catch (error) {
            Logger.error(`火山方舟配置向导出错: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 设置 Coding Plan API 密钥
     */
    static async setCodingPlanApiKey(displayName: string, apiKeyTemplate: string): Promise<void> {
        const result = await vscode.window.showInputBox({
            prompt: `请输入 ${displayName} 的 Coding Plan API Key（留空可清除）`,
            title: `设置 ${displayName} Coding Plan API Key`,
            placeHolder: apiKeyTemplate,
            password: true,
            ignoreFocusOut: true
        });

        if (result === undefined) {
            return;
        }

        try {
            if (result.trim() === '') {
                Logger.info(`${displayName} Coding Plan API Key 已清除`);
                await ApiKeyManager.deleteApiKey(this.PROVIDER_KEY);
                vscode.window.showInformationMessage(`${displayName} Coding Plan API Key 已清除`);
            } else {
                await ApiKeyManager.setApiKey(this.PROVIDER_KEY, result.trim());
                Logger.info(`${displayName} Coding Plan API Key 已设置`);
                vscode.window.showInformationMessage(`${displayName} Coding Plan API Key 已设置`);
            }
        } catch (error) {
            Logger.error(
                `火山方舟 Coding Plan API Key 操作失败: ${error instanceof Error ? error.message : '未知错误'}`
            );
            vscode.window.showErrorMessage(`设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 设置 Agent Plan 专用密钥
     */
    static async setAgentPlanApiKey(displayName: string, apiKeyTemplate: string): Promise<void> {
        const result = await vscode.window.showInputBox({
            prompt: `请输入 ${displayName} 的 Agent Plan 专用 API Key（留空可清除）`,
            title: `设置 ${displayName} Agent Plan 专用 API Key`,
            placeHolder: apiKeyTemplate,
            password: true,
            ignoreFocusOut: true
        });

        if (result === undefined) {
            return;
        }

        try {
            if (result.trim() === '') {
                Logger.info(`${displayName} Agent Plan 专用 API Key 已清除`);
                await ApiKeyManager.deleteApiKey(this.AGENT_PLAN_KEY);
                vscode.window.showInformationMessage(`${displayName} Agent Plan 专用 API Key 已清除`);
            } else {
                await ApiKeyManager.setApiKey(this.AGENT_PLAN_KEY, result.trim());
                Logger.info(`${displayName} Agent Plan 专用 API Key 已设置`);
                vscode.window.showInformationMessage(`${displayName} Agent Plan 专用 API Key 已设置`);
            }
        } catch (error) {
            Logger.error(
                `火山方舟 Agent Plan API Key 操作失败: ${error instanceof Error ? error.message : '未知错误'}`
            );
            vscode.window.showErrorMessage(`设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
}
