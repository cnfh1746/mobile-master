// ==Mobile API Integration==
// @name         Mobile API Integration System
// @version      1.0.0
// @description  智能内容生成与插入系统，使用第二API自动生成手机内容
// @author       cd
// @license      MIT

/**
 * 移动端API集成系统
 * 实现AI生成内容的自动插入功能，完全在手机界面内运行
 */
class MobileAPIIntegration {
    constructor() {
        this.isInitialized = false;
        this.apiConfig = null;
        this.settings = this.getDefaultSettings();
        this.promptTemplates = this.getPromptTemplates();
        this.contentParser = null;
        this.inlineInserter = null;
        
        // 绑定到全局
        window.mobileAPIIntegration = this;
        
        console.log('[Mobile API Integration] 系统已创建');
    }

    /**
     * 获取默认设置
     */
    getDefaultSettings() {
        return {
            enabled: false,
            insertMode: 'inline',
            autoDetect: true,
            autoGenerate: false,
            promptTemplate: 'phoneGeneral',
            targetFormats: ['privateMessage', 'groupMessage', 'moments', 'product', 'task', 'live', 'backpack'],
            triggerKeywords: ['手机', '消息', '朋友圈', '群聊', '淘宝', '直播', '查看', '刷新'],
            minConfidence: 0.6
        };
    }

    /**
     * 获取提示词模板（从世界书JSON提取）
     */
    getPromptTemplates() {
        return {
            phoneGeneral: {
                name: '手机系统通用规则',
                content: `# 线上规则\n**角色会主动给用户发送信息，请根据剧情需要生成消息格式。**\n**所有线上输出必须按照格式：**\n\n私聊格式：[对方消息|名字|好友id|消息类型|内容]\n群聊格式：[群聊消息|群聊id|姓名|消息类型|内容]\n朋友圈格式：[朋友圈|角色名字|角色id|楼层id|内容]\n商品格式：[商品|商品名称|分类|描述|价格]\n任务格式：[任务|编号|名称|介绍|发布人|奖励]\n直播格式：[直播|类型|内容]\n背包格式：[背包|商品名|类型|描述|数量]\n加好友格式：[好友id|好友名字|数字ID]\n\n**消息类型包括：文字、语音、红包、表情包**\n**禁止生成用户消息，禁止替代用户发言**`
            },
            privateMessage: {
                name: '私聊消息',
                content: `# 私聊消息格式\n[对方消息|对方名字|对方好友id|消息类型|消息内容]\n消息类型：文字、语音、红包、表情包\n示例：[对方消息|秦倦|500002|文字|小朋友，这么晚还不睡，在想什么呢]`
            }
        };
    }

    /**
     * 初始化系统
     */
    async initialize() {
        try {
            await this.waitForAPIConfig();
            await this.loadSettings();
            
            this.contentParser = new ContentParser();
            this.inlineInserter = new InlineInserter(this);
            
            this.createUI();
            this.bindEvents();
            this.registerConsoleCommands();
            
            this.isInitialized = true;
            console.log('[Mobile API Integration] ✅ 系统初始化完成');
            
            return true;
        } catch (error) {
            console.error('[Mobile API Integration] ❌ 初始化失败:', error);
            return false;
        }
    }

    async waitForAPIConfig() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.mobileCustomAPIConfig && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.mobileCustomAPIConfig) {
            this.apiConfig = window.mobileCustomAPIConfig;
            console.log('[Mobile API Integration] API配置已加载');
        } else {
            throw new Error('无法加载API配置模块');
        }
    }

    async loadSettings() {
        try {
            const saved = localStorage.getItem('mobile_api_integration_settings');
            if (saved) {
                this.settings = { ...this.getDefaultSettings(), ...JSON.parse(saved) };
            }
            console.log('[Mobile API Integration] 设置已加载');
        } catch (error) {
            console.error('[Mobile API Integration] 加载设置失败:', error);
        }
    }

    async saveSettings() {
        try {
            localStorage.setItem('mobile_api_integration_settings', JSON.stringify(this.settings));
            console.log('[Mobile API Integration] 设置已保存');
            
            document.dispatchEvent(new CustomEvent('mobile-api-integration-updated', {
                detail: this.settings
            }));
            
            return true;
        } catch (error) {
            console.error('[Mobile API Integration] 保存设置失败:', error);
            return false;
        }
    }

    createUI() {
        this.createTriggerButton();
        this.createConfigPanel();
    }

    createTriggerButton() {
        if (document.getElementById('mobile-api-integration-trigger')) {
            return;
        }

        const triggerButton = document.createElement('button');
        triggerButton.id = 'mobile-api-integration-trigger';
        triggerButton.innerHTML = '🤖';
        triggerButton.title = '智能生成配置';
        triggerButton.style.cssText = 'position:fixed;bottom:260px;right:20px;width:50px;height:50px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:50%;font-size:20px;cursor:pointer;z-index:9997;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:all 0.3s ease;display:flex;align-items:center;justify-content:center;';

        triggerButton.addEventListener('click', () => this.showConfigPanel());
        document.body.appendChild(triggerButton);
        console.log('[Mobile API Integration] ✅ 触发按钮已创建');
    }

    createConfigPanel() {
        if (document.getElementById('mobile-api-integration-panel')) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'mobile-api-integration-panel';
        panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:none;backdrop-filter:blur(5px);';

        const content = document.createElement('div');
        content.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border-radius:15px;padding:20px;width:90%;max-width:500px;max-height:80vh;overflow-y:auto;box-shadow:0 10px 30px rgba(0,0,0,0.3);';
        content.innerHTML = this.getConfigPanelHTML();
        
        panel.appendChild(content);
        document.body.appendChild(panel);
        console.log('[Mobile API Integration] ✅ 配置面板已创建');
    }

    getConfigPanelHTML() {
        const s = this.settings;
        return `
            <div style="position:relative;">
                <h3 style="margin:0 0 20px 0;color:#333;text-align:center;">🤖 智能生成配置</h3>
                <button id="close-api-integration" style="position:absolute;top:0;right:0;background:none;border:none;font-size:24px;cursor:pointer;color:#666;">×</button>
            </div>
            <div>
                <div style="margin-bottom:20px;">
                    <label style="display:flex;align-items:center;gap:10px;font-weight:500;">
                        <input type="checkbox" id="integration-enabled" ${s.enabled ? 'checked' : ''}>
                        启用智能生成系统
                    </label>
                    <small style="color:#666;font-size:12px;">使用第二API自动生成手机内容</small>
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:flex;align-items:center;gap:10px;font-weight:500;">
                        <input type="checkbox" id="auto-generate" ${s.autoGenerate ? 'checked' : ''}>
                        自动生成模式
                    </label>
                    <small style="color:#666;font-size:12px;">检测到相关内容时自动调用API生成</small>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="display:block;margin-bottom:5px;font-weight:500;color:#000;">插入模式:</label>
                    <select id="insert-mode" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:5px;background-color:#fff;color:#000;">
                        <option value="inline" ${s.insertMode === 'inline' ? 'selected' : ''}>内联模式（推荐）</option>
                        <option value="replace" ${s.insertMode === 'replace' ? 'selected' : ''}>替换模式</option>
                        <option value="new" ${s.insertMode === 'new' ? 'selected' : ''}>新消息模式</option>
                    </select>
                </div>
                <div style="margin-bottom:15px;padding:10px;background:#f8f9fa;border-radius:5px;">
                    <div style="font-weight:500;margin-bottom:5px;color:#000;">API状态:</div>
                    <div id="api-status-text" style="font-size:14px;color:#666;">检查中...</div>
                </div>
                <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
                    <button type="button" id="manual-generate-phone" style="flex:1;min-width:120px;padding:12px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:500;">立即生成</button>
                    <button type="button" id="test-generation" style="flex:1;min-width:120px;padding:12px;background:#28a745;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:500;">测试API</button>
                    <button type="button" id="save-integration-settings" style="flex:1;min-width:120px;padding:12px;background:#007bff;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:500;">保存设置</button>
                </div>
            </div>
        `;
    }

    showConfigPanel() {
        const panel = document.getElementById('mobile-api-integration-panel');
        if (panel) {
            panel.style.display = 'block';
            this.checkAPIStatus();
        }
    }

    hideConfigPanel() {
        const panel = document.getElementById('mobile-api-integration-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'close-api-integration') {
                this.hideConfigPanel();
            }
            if (e.target.id === 'save-integration-settings') {
                this.saveSettingsFromUI();
            }
            if (e.target.id === 'test-generation') {
                this.testGeneration();
            }
            if (e.target.id === 'manual-generate-phone') {
                this.manualGenerate();
            }
            if (e.target.id === 'mobile-api-integration-panel' && e.target === e.currentTarget) {
                this.hideConfigPanel();
            }
        });
        
        // 如果启用了自动生成，启动监听
        if (this.settings.enabled && this.settings.autoGenerate) {
            this.startAutoDetection();
        }
    }

    saveSettingsFromUI() {
        this.settings.enabled = document.getElementById('integration-enabled')?.checked || false;
        this.settings.autoGenerate = document.getElementById('auto-generate')?.checked || false;
        this.settings.insertMode = document.getElementById('insert-mode')?.value || 'inline';
        
        this.saveSettings();
        alert('设置已保存！');
    }

    async checkAPIStatus() {
        const statusEl = document.getElementById('api-status-text');
        if (!statusEl) return;
        
        if (this.apiConfig && this.apiConfig.isConfigured()) {
            statusEl.innerHTML = '✅ API已配置';
            statusEl.style.color = '#28a745';
        } else {
            statusEl.innerHTML = '❌ API未配置，请先配置自定义API';
            statusEl.style.color = '#dc3545';
        }
    }

    async testGeneration() {
        console.log('[Mobile API Integration] 开始测试生成...');
        
        if (!this.apiConfig || !this.apiConfig.isConfigured()) {
            alert('❌ 请先配置自定义API！');
            return;
        }
        
        try {
            const testPrompt = this.promptTemplates.privateMessage.content;
            const messages = [
                { role: 'system', content: testPrompt },
                { role: 'user', content: '请生成一条私聊消息示例' }
            ];
            
            this.updateStatus('正在测试API调用...', 'info');
            const response = await this.apiConfig.callAPI(messages, { temperature: 0.8, max_tokens: 500 });
            
            if (response && response.content) {
                console.log('[Mobile API Integration] 测试成功，返回内容:', response.content);
                alert('✅ API测试成功！\n\n生成内容:\n' + response.content);
                this.updateStatus('API测试成功', 'success');
            } else {
                throw new Error('API返回格式错误');
            }
        } catch (error) {
            console.error('[Mobile API Integration] 测试失败:', error);
            alert('❌ API测试失败: ' + error.message);
            this.updateStatus('API测试失败', 'error');
        }
    }
    
    /**
     * 更新状态显示
     */
    updateStatus(message, type = 'info') {
        const statusEl = document.getElementById('api-status-text');
        if (statusEl) {
            const colors = { info: '#666', success: '#28a745', warning: '#ffc107', error: '#dc3545' };
            statusEl.innerHTML = message;
            statusEl.style.color = colors[type] || colors.info;
        }
        console.log(`[Mobile API Integration] ${message}`);
    }
    
    /**
     * 生成手机内容（核心方法）
     */
    async generatePhoneContent(context, contentType = 'phoneGeneral') {
        try {
            console.log('[Mobile API Integration] 🚀 开始生成手机内容...');
            
            if (!this.apiConfig || !this.apiConfig.isConfigured()) {
                throw new Error('API未配置');
            }
            
            // 获取提示词模板
            const template = this.promptTemplates[contentType];
            if (!template) {
                throw new Error(`未找到模板: ${contentType}`);
            }
            
            // 构建API请求
            const messages = [
                { role: 'system', content: template.content },
                { role: 'user', content: `请根据以下对话内容生成手机相关内容：\n\n${context}` }
            ];
            
            console.log('[Mobile API Integration] 📤 发送API请求:', messages);
            
            // 调用API
            const response = await this.apiConfig.callAPI(messages, {
                temperature: 0.8,
                max_tokens: 2000
            });
            
            console.log('[Mobile API Integration] 📥 API返回:', response);
            
            if (response && response.content) {
                console.log('[Mobile API Integration] ✅ 生成成功');
                return response.content;
            } else {
                throw new Error('API返回格式错误');
            }
        } catch (error) {
            console.error('[Mobile API Integration] ❌ 生成失败:', error);
            throw error;
        }
    }
    
    /**
     * 监听聊天消息（自动检测触发）
     */
    startAutoDetection() {
        if (!this.settings.enabled || !this.settings.autoGenerate) {
            return;
        }
        
        console.log('[Mobile API Integration] 🎧 启动自动检测...');
        
        // 监听新消息事件
        document.addEventListener('message_sent', async (e) => {
            if (!this.settings.autoGenerate) return;
            
            try {
                const message = e.detail;
                await this.handleNewMessage(message);
            } catch (error) {
                console.error('[Mobile API Integration] 处理消息失败:', error);
            }
        });
    }
    
    /**
     * 处理新消息
     */
    async handleNewMessage(message) {
        console.log('[Mobile API Integration] 📨 收到新消息:', message);
        
        // 检查是否包含触发关键词
        const text = message.mes || '';
        const hasKeyword = this.settings.triggerKeywords.some(kw => text.includes(kw));
        
        if (!hasKeyword) {
            console.log('[Mobile API Integration] 未检测到触发关键词');
            return;
        }
        
        console.log('[Mobile API Integration] ✨ 检测到触发关键词，开始生成内容...');
        
        // 获取聊天上下文
        const context = await this.getChatContext();
        
        // 生成内容
        const generatedContent = await this.generatePhoneContent(context);
        
        // 解析并插入内容
        const parsedContents = this.contentParser.parseContent(generatedContent);
        if (parsedContents.length > 0) {
            await this.inlineInserter.insertContent(message, parsedContents);
        }
    }
    
    /**
     * 获取聊天上下文
     */
    async getChatContext() {
        try {
            if (window.mobileContextEditor) {
                const chatData = window.mobileContextEditor.getCurrentChatData();
                return this.buildContextString(chatData);
            }
            return '';
        } catch (error) {
            console.error('[Mobile API Integration] 获取上下文失败:', error);
            return '';
        }
    }
    
    /**
     * 构建上下文字符串
     */
    buildContextString(chatData) {
        if (!chatData || !chatData.messages) return '';
        
        const recentMessages = chatData.messages.slice(-5);
        let context = `角色: ${chatData.characterName || '未知'}\n\n`;
        
        recentMessages.forEach(msg => {
            const speaker = msg.is_user ? '用户' : chatData.characterName;
            context += `${speaker}: ${msg.mes}\n`;
        });
        
        return context;
    }
    
    /**
     * 手动触发生成
     */
    async manualGenerate() {
        try {
            console.log('[Mobile API Integration] 🎯 手动触发生成...');
            
            if (!this.settings.enabled) {
                alert('❌ 请先启用智能生成系统！');
                return;
            }
            
            if (!this.apiConfig || !this.apiConfig.isConfigured()) {
                alert('❌ 请先配置自定义API！');
                return;
            }
            
            this.updateStatus('正在生成手机内容...', 'info');
            
            // 获取当前聊天上下文
            const context = await this.getChatContext();
            if (!context) {
                throw new Error('无法获取聊天上下文');
            }
            
            // 生成内容
            const generatedContent = await this.generatePhoneContent(context);
            console.log('[Mobile API Integration] 生成的内容:', generatedContent);
            
            // 解析内容
            const parsedContents = this.contentParser.parseContent(generatedContent);
            console.log('[Mobile API Integration] 解析结果:', parsedContents);
            
            if (parsedContents.length === 0) {
                alert('⚠️ 未解析到有效的手机内容格式');
                this.updateStatus('未解析到有效内容', 'warning');
                return;
            }
            
            // 获取当前最新消息
            const chatData = window.mobileContextEditor?.getCurrentChatData();
            if (chatData && chatData.messages && chatData.messages.length > 0) {
                const lastMessage = chatData.messages[chatData.messages.length - 1];
                await this.inlineInserter.insertContent(lastMessage, parsedContents);
                
                alert(`✅ 成功生成并插入 ${parsedContents.length} 项手机内容！`);
                this.updateStatus('生成成功', 'success');
            } else {
                alert('⚠️ 无法找到可插入的消息');
                this.updateStatus('无可插入的消息', 'warning');
            }
        } catch (error) {
            console.error('[Mobile API Integration] 手动生成失败:', error);
            alert('❌ 生成失败: ' + error.message);
            this.updateStatus('生成失败', 'error');
        }
    }
    
    /**
     * 注册控制台命令
     */
    registerConsoleCommands() {
        if (!window.MobileContext) {
            window.MobileContext = {};
        }
        
        // 智能生成命令
        window.MobileContext.generatePhone = () => this.manualGenerate();
        window.MobileContext.testPhoneAPI = () => this.testGeneration();
        window.MobileContext.showPhoneConfig = () => this.showConfigPanel();
        window.MobileContext.getPhoneSettings = () => this.settings;
        window.MobileContext.enableAutoGenerate = () => {
            this.settings.autoGenerate = true;
            this.saveSettings();
            this.startAutoDetection();
            console.log('✅ 自动生成已启用');
        };
        window.MobileContext.disableAutoGenerate = () => {
            this.settings.autoGenerate = false;
            this.saveSettings();
            console.log('✅ 自动生成已禁用');
        };
        
        console.log('📱 [智能生成系统] 控制台命令已注册:');
        console.log('  - MobileContext.generatePhone() // 手动触发生成手机内容');
        console.log('  - MobileContext.testPhoneAPI() // 测试API连接');
        console.log('  - MobileContext.showPhoneConfig() // 显示配置面板');
        console.log('  - MobileContext.getPhoneSettings() // 获取当前设置');
        console.log('  - MobileContext.enableAutoGenerate() // 启用自动生成');
        console.log('  - MobileContext.disableAutoGenerate() // 禁用自动生成');
    }
}

/**
 * 内容解析器
 */
class ContentParser {
    constructor() {
        this.patterns = {
            privateMessage: /\[对方消息\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g,
            groupMessage: /\[群聊消息\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g,
            moments: /\[朋友圈\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g,
            momentsReply: /\[朋友圈回复\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g,
            product: /\[商品\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g,
            task: /\[任务\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g,
            live: /\[直播\|(.*?)\|(.*?)\]/g,
            backpack: /\[背包\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/g,
            friendId: /\[好友id\|(.*?)\|(.*?)\]/g
        };
    }

    parseContent(text) {
        const results = [];
        
        for (const [type, pattern] of Object.entries(this.patterns)) {
            const regex = new RegExp(pattern.source, 'g');
            let match;
            
            while ((match = regex.exec(text)) !== null) {
                results.push({
                    type: type,
                    raw: match[0],
                    data: this.extractData(type, match)
                });
            }
        }
        
        return results;
    }

    extractData(type, match) {
        switch(type) {
            case 'privateMessage':
                return { name: match[1], id: match[2], msgType: match[3], content: match[4] };
            case 'groupMessage':
                return { groupId: match[1], name: match[2], msgType: match[3], content: match[4] };
            case 'moments':
                return { name: match[1], id: match[2], postId: match[3], content: match[4] };
            case 'product':
                return { name: match[1], category: match[2], desc: match[3], price: match[4] };
            case 'task':
                return { taskId: match[1], name: match[2], desc: match[3], publisher: match[4], reward: match[5] };
            case 'live':
                return { type: match[1], content: match[2] };
            case 'backpack':
                return { name: match[1], type: match[2], desc: match[3], count: match[4] };
            case 'friendId':
                return { name: match[1], id: match[2] };
            default:
                return {};
        }
    }
}

/**
 * 内联插入器
 */
class InlineInserter {
    constructor(integration) {
        this.integration = integration;
    }

    async insertContent(message, parsedContents) {
        if (!message.extra) {
            message.extra = {};
        }
        
        if (!message.extra.phoneContents) {
            message.extra.phoneContents = [];
        }
        
        for (const content of parsedContents) {
            message.extra.phoneContents.push({
                type: content.type,
                data: content.data,
                timestamp: Date.now()
            });
        }
        
        message.extra.hasPhoneContent = true;
        
        await this.updateMessageDisplay(message);
        this.notifyPhoneApps(parsedContents);
        
        console.log('[InlineInserter] 内容已插入:', parsedContents.length, '项');
    }

    updateMessageDisplay(message) {
        const messageElement = document.querySelector(`.mes[mesid="${message.index}"]`);
        
        if (messageElement && message.extra.hasPhoneContent) {
            const existingBtn = messageElement.querySelector('.phone-content-indicator');
            if (existingBtn) return;
            
            const phoneButton = document.createElement('div');
            phoneButton.className = 'phone-content-indicator';
            phoneButton.style.cssText = 'margin-top:10px;';
            phoneButton.innerHTML = `
                <button class="view-phone-content-btn" style="padding:8px 16px;background:#667eea;color:white;border:none;border-radius:5px;cursor:pointer;font-size:14px;">
                    📱 查看手机内容 (${message.extra.phoneContents.length})
                </button>
            `;
            
            phoneButton.querySelector('button').addEventListener('click', () => {
                this.showPhoneContentModal(message);
            });
            
            const mesText = messageElement.querySelector('.mes_text');
            if (mesText) {
                mesText.appendChild(phoneButton);
            }
        }
    }

    showPhoneContentModal(message) {
        console.log('[InlineInserter] 显示手机内容:', message.extra.phoneContents);
        alert('查看手机内容功能开发中...\n\n' + JSON.stringify(message.extra.phoneContents, null, 2));
    }

    notifyPhoneApps(contents) {
        document.dispatchEvent(new CustomEvent('phone-content-generated', {
            detail: contents
        }));
    }
}

// 自动初始化
(function() {
    console.log('[Mobile API Integration] 准备初始化...');
    
    function initMobileAPIIntegration() {
        if (window.mobileAPIIntegration && window.mobileAPIIntegration.isInitialized) {
            console.log('[Mobile API Integration] 已初始化，跳过');
            return;
        }
        
        const integration = new MobileAPIIntegration();
        integration.initialize().then(success => {
            if (success) {
                console.log('[Mobile API Integration] 🎉 智能生成系统已就绪！');
                console.log('[Mobile API Integration] 使用 MobileContext.generatePhone() 手动生成内容');
            }
        });
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initMobileAPIIntegration, 1000);
        });
    } else {
        setTimeout(initMobileAPIIntegration, 1000);
    }
})();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MobileAPIIntegration, ContentParser, InlineInserter };
}
