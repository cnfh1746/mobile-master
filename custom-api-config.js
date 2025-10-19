// ==Mobile Custom API Config==
// @name         Mobile Custom API Configuration
// @version      1.1.0
// @description  移动端自定义API配置管理器，支持多种API服务商
// @author       cd
// @license      MIT

/**
 * 移动端自定义API配置管理器
 * 移植自论坛应用和real-time-status-bar插件的API配置功能
 */
class MobileCustomAPIConfig {
    constructor() {
        this.isInitialized = false;
        this.currentSettings = this.getDefaultSettings();
        this.supportedProviders = this.getSupportedProviders();

        // 初始化Gemini的内置URL
        this.geminiUrl = this.supportedProviders.gemini.defaultUrl;

        // 缓存成功的配置以提升性能
        this.successfulConfigs = new Map();

        // 绑定到全局窗口对象
        window.mobileCustomAPIConfig = this;

        console.log('[Mobile API Config] 自定义API配置管理器已创建');
    }

    /**
     * 获取默认设置
     */
    getDefaultSettings() {
        return {
            enabled: false,
            provider: 'openai', // 默认使用OpenAI
            apiUrl: '',
            apiKey: '',
            model: '',
            temperature: 0.8,
            maxTokens: 50000, // 增加默认token限制
            useProxy: false,
            proxyUrl: '',
            timeout: 60000, // 增加超时时间至60秒
            retryCount: 3,
            // 高级设置
            customHeaders: {},
            systemPrompt: '',
            streamEnabled: false,
            // 新增设置：自动重试截断的响应
            autoRetryTruncated: true,
            truncationRetryMaxTokens: 60000 // 重试时使用的更大token限制（不超过65536）
        };
    }

    /**
     * 获取支持的API服务商配置
     */
    getSupportedProviders() {
        return {
            openai: {
                name: 'OpenAI',
                defaultUrl: 'https://api.openai.com',
                urlSuffix: 'v1/chat/completions',
                modelsEndpoint: 'v1/models',
                defaultModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'],
                authType: 'Bearer',
                requiresKey: true,
                icon: '🤖'
            },
            gemini: {
                name: 'Google Gemini',
                defaultUrl: 'https://generativelanguage.googleapis.com',
                urlSuffix: 'v1beta/models/{model}:generateContent',
                modelsEndpoint: 'v1beta/models',
                defaultModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'],
                authType: 'Key',
                requiresKey: true,
                icon: '💎'
            },
            backend_custom: {
                name: '后端API',
                defaultUrl: '',
                urlSuffix: 'chat/completions',
                modelsEndpoint: 'models',
                defaultModels: [],
                authType: 'Bearer',
                requiresKey: true,
                icon: '🔗',
                description: '通过SillyTavern后端代理调用'
            },
            frontend_custom: {
                name: '前端API',
                defaultUrl: '',
                urlSuffix: 'chat/completions',
                modelsEndpoint: 'models',
                defaultModels: [],
                authType: 'Bearer',
                requiresKey: true,
                icon: '⚡',
                description: '直接从浏览器调用API'
            }
        };
    }

    /**
     * 初始化API配置管理器
     */
    async initialize() {
        try {
            await this.loadSettings();
            this.createUI();
            this.bindEvents();
            this.isInitialized = true;

            console.log('[Mobile API Config] ✅ 自定义API配置管理器初始化完成');
            console.log('[Mobile API Config] 📋 当前设置:', {
                provider: this.currentSettings.provider,
                enabled: this.currentSettings.enabled,
                apiUrl: this.currentSettings.apiUrl || '(未设置)',
                hasApiKey: !!this.currentSettings.apiKey,
                model: this.currentSettings.model || '(未设置)',
                支持的服务商: Object.keys(this.supportedProviders)
            });
            return true;
        } catch (error) {
            console.error('[Mobile API Config] ❌ 初始化失败:', error);
            return false;
        }
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            const savedSettings = localStorage.getItem('mobile_custom_api_settings');
            if (savedSettings) {
                this.currentSettings = { ...this.getDefaultSettings(), ...JSON.parse(savedSettings) };
            }

            console.log('[Mobile API Config] 设置已加载:', this.currentSettings);
        } catch (error) {
            console.error('[Mobile API Config] 加载设置失败:', error);
            this.currentSettings = this.getDefaultSettings();
        }
    }

    /**
     * 保存设置
     */
    async saveSettings() {
        try {
            localStorage.setItem('mobile_custom_api_settings', JSON.stringify(this.currentSettings));
            console.log('[Mobile API Config] 设置已保存');

            // 触发设置更新事件
            document.dispatchEvent(new CustomEvent('mobile-api-config-updated', {
                detail: this.currentSettings
            }));

            return true;
        } catch (error) {
            console.error('[Mobile API Config] 保存设置失败:', error);
            return false;
        }
    }

    /**
     * 创建API配置UI
     */
    createUI() {
        // 创建触发按钮
        this.createTriggerButton();

        // 创建配置面板
        this.createConfigPanel();
    }

    /**
     * 创建触发按钮
     */
    createTriggerButton() {
        // 检查是否已存在按钮
        if (document.getElementById('mobile-api-config-trigger')) {
            return;
        }

        const triggerButton = document.createElement('button');
        triggerButton.id = 'mobile-api-config-trigger';
        triggerButton.className = 'mobile-api-config-btn';
        triggerButton.innerHTML = '🔧';
        triggerButton.title = 'API配置';
        triggerButton.style.cssText = `
            position: fixed;
            bottom: 200px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #8B5CF6, #EF4444);
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            z-index: 9997;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // 悬停效果
        triggerButton.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
        });

        triggerButton.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        });

        // 点击事件
        triggerButton.addEventListener('click', () => {
            this.showConfigPanel();
        });

        document.body.appendChild(triggerButton);
        console.log('[Mobile API Config] ✅ 触发按钮已创建');
    }

    /**
     * 创建配置面板
     */
    createConfigPanel() {
        if (document.getElementById('mobile-api-config-panel')) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'mobile-api-config-panel';
        panel.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none;
            backdrop-filter: blur(5px);
        `;

        const content = document.createElement('div');
        content.className = 'mobile-api-config-content';
        content.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 15px;
            padding: 20px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

        content.innerHTML = this.getConfigPanelHTML();
        panel.appendChild(content);
        document.body.appendChild(panel);

        console.log('[Mobile API Config] ✅ 配置面板已创建');
    }

    /**
     * 获取配置面板HTML
     */
    getConfigPanelHTML() {
        const providers = this.supportedProviders;
        const settings = this.currentSettings;

        return `
            <div class="mobile-api-config-header">
                <h3 style="margin: 0 0 20px 0; color: #333; text-align: center;">
                    ⚙️ API配置
                </h3>
                <button id="close-api-config" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #666;
                ">×</button>
            </div>

            <div class="mobile-api-config-form">
                <!-- 启用开关 -->
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; font-weight: 500;">
                        <input type="checkbox" id="api-enabled" ${settings.enabled ? 'checked' : ''}>
                        启用自定义API
                    </label>
                </div>

                <!-- 服务商选择 -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">API服务商:</label>
                    <select id="api-provider" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; background-color: #fff; color: #000;">
                        ${Object.entries(providers).map(([key, provider]) =>
                            `<option value="${key}" ${key === settings.provider ? 'selected' : ''} title="${provider.description || ''}">${provider.icon} ${provider.name}${provider.description ? ` - ${provider.description}` : ''}</option>`
                        ).join('')}
                    </select>
                </div>

                <!-- API URL -->
                <div style="margin-bottom: 15px;" id="api-url-section">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">API URL:</label>
                    <input type="text" id="api-url" placeholder="https://api.openai.com"
                           value="${settings.apiUrl}"
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;background-color: #fff;color: #000;">
                    <small style="color: #666; font-size: 12px;">留空使用默认URL</small>
                </div>

                <!-- API密钥 -->
                <div style="margin-bottom: 15px;" id="api-key-section">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">API密钥:</label>
                    <div style="position: relative;">
                        <input type="password" id="api-key" placeholder="sk-... 或 AIza..."
                               value="${settings.apiKey}"
                               style="width: 100%; padding: 8px 35px 8px 8px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;background-color: #fff;color: #000;">
                        <button type="button" id="toggle-api-key" style="
                            position: absolute;
                            right: 8px;
                            top: 50%;
                            transform: translateY(-50%);
                            background: none;
                            border: none;
                            cursor: pointer;
                            color: #666;
                        ">👁️</button>
                    </div>
                </div>

                <!-- 模型选择 -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">模型:</label>
                    <div style="display: flex; gap: 10px;">
                        <select id="api-model" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="">选择模型...</option>
                        </select>
                        <button type="button" id="refresh-models" style="
                            padding: 8px 15px;
                            background: #007bff;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                        ">📥</button>
                    </div>
                </div>

                <!-- 高级设置 -->
                <details style="margin-bottom: 15px;">
                    <summary style="cursor: pointer; font-weight: 500; margin-bottom: 10px;color: #000;">⚙️ 高级设置</summary>

                    <div style="margin-left: 15px;">
                        <!-- 温度 -->
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;color: #000;">温度 (0-2):</label>
                            <input type="range" id="api-temperature" min="0" max="2" step="0.1"
                                   value="${settings.temperature}"
                                   style="width: 100%;">
                            <span id="temperature-value" style="font-size: 12px; color: #666;">${settings.temperature}</span>
                        </div>

                        <!-- 最大令牌数 -->
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">最大令牌数:</label>
                            <input type="number" id="api-max-tokens" min="1" max="200000"
                                   value="${settings.maxTokens}"
                                   style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;background-color: #fff;color: #000;">
                            <small style="color: #666; font-size: 12px;">建议设置较高的值以避免内容截断（如50000-80000）</small>
                        </div>

                        <!-- 自动重试截断响应 -->
                        <div style="margin-bottom: 10px;">
                            <label style="display: flex; align-items: center; gap: 10px; font-weight: 500;">
                                <input type="checkbox" id="api-auto-retry-truncated" ${settings.autoRetryTruncated ? 'checked' : ''}>
                                自动重试截断的响应
                            </label>
                            <small style="color: #666; font-size: 12px;">当检测到内容被截断时，自动使用更大的token限制重试</small>
                        </div>

                        <!-- 系统提示词 -->
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">系统提示词:</label>
                            <textarea id="api-system-prompt" rows="3"
                                      placeholder="可选的系统提示词..."
                                      style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px; resize: vertical; box-sizing: border-box;">${settings.systemPrompt}</textarea>
                        </div>
                    </div>
                </details>

                <!-- 按钮组 -->
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="button" id="test-api-connection" style="
                        flex: 1;
                        padding: 12px;
                        background: #28a745;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                    ">🧪 测试连接</button>

                    <button type="button" id="save-api-config" style="
                        flex: 1;
                        padding: 12px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                    ">💾 保存配置</button>
                </div>

                <!-- 状态显示 -->
                <div id="api-config-status" style="
                    margin-top: 15px;
                    padding: 10px;
                    border-radius: 5px;
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    font-size: 14px;
                    display: none;
                "></div>
            </div>
        `;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭面板
        $(document).on('click', '#close-api-config', () => {
            this.hideConfigPanel();
        });

        // 点击面板外部关闭
        $(document).on('click', '#mobile-api-config-panel', (e) => {
            if (e.target.id === 'mobile-api-config-panel') {
                this.hideConfigPanel();
            }
        });

        // 服务商选择变化
        $(document).on('change', '#api-provider', (e) => {
            this.onProviderChange(e.target.value);
        });

        // 密钥显示切换
        $(document).on('click', '#toggle-api-key', () => {
            const keyInput = document.getElementById('api-key');
            const isPassword = keyInput.type === 'password';
            keyInput.type = isPassword ? 'text' : 'password';
            document.getElementById('toggle-api-key').textContent = isPassword ? '🙈' : '👁️';
        });

        // 温度滑块
        $(document).on('input', '#api-temperature', (e) => {
            document.getElementById('temperature-value').textContent = e.target.value;
        });

        // 刷新模型列表
        $(document).on('click', '#refresh-models', () => {
            this.refreshModels();
        });

        // 测试连接
        $(document).on('click', '#test-api-connection', () => {
            this.testConnection();
        });

        // 保存配置
        $(document).on('click', '#save-api-config', () => {
            this.saveConfigFromUI();
        });
    }

    /**
     * 显示配置面板
     */
    showConfigPanel() {
        const panel = document.getElementById('mobile-api-config-panel');
        if (panel) {
            panel.style.display = 'block';
            this.updateUIFromSettings();

            // 确保URL显示状态正确
            const currentProvider = this.currentSettings.provider;
            this.onProviderChange(currentProvider);
        }
    }

    /**
     * 隐藏配置面板
     */
    hideConfigPanel() {
        const panel = document.getElementById('mobile-api-config-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * 当服务商选择变化时
     */
    onProviderChange(providerKey) {
        const provider = this.supportedProviders[providerKey];
        if (!provider) return;

        console.log('[Mobile API Config] 服务商切换:', providerKey, provider);

        // 处理URL输入框的显示/隐藏
        const urlSection = document.getElementById('api-url-section');
        const urlInput = document.getElementById('api-url');

        if (providerKey === 'gemini') {
            // Gemini: 隐藏URL输入框，使用内置URL
            if (urlSection) {
                urlSection.style.display = 'none';
            }
            // 内部设置Gemini的URL，但不显示给用户
            this.geminiUrl = provider.defaultUrl;
        } else {
            // OpenAI、后端API和前端API: 显示URL输入框让用户编辑
            if (urlSection) {
                urlSection.style.display = 'block';
            }

            // 恢复或设置非Gemini服务商的URL
            if (urlInput) {
                // 如果之前保存过这个服务商的URL，则恢复；否则使用默认值
                const savedUrl = this.getNonGeminiUrl(providerKey);
                urlInput.value = savedUrl || provider.defaultUrl;
                urlInput.placeholder = provider.defaultUrl || 'https://api.openai.com';
            }
        }

        // 更新API密钥占位符
        const keyInput = document.getElementById('api-key');
        if (keyInput) {
            if (providerKey === 'openai') {
                keyInput.placeholder = 'sk-...';
            } else if (providerKey === 'gemini') {
                keyInput.placeholder = 'AIza...';
            } else if (providerKey === 'backend_custom') {
                keyInput.placeholder = '后端API密钥...';
            } else if (providerKey === 'frontend_custom') {
                keyInput.placeholder = '前端API密钥...';
            } else {
                keyInput.placeholder = '输入API密钥...';
            }
        }

        // 显示/隐藏密钥输入框
        const keySection = document.getElementById('api-key-section');
        if (keySection) {
            keySection.style.display = provider.requiresKey ? 'block' : 'none';
        }

        // 更新模型列表
        this.updateModelList(provider.defaultModels);
    }

    /**
     * 获取非Gemini服务商的保存URL
     */
    getNonGeminiUrl(providerKey) {
        const saved = localStorage.getItem(`mobile_api_url_${providerKey}`);
        return saved || '';
    }

    /**
     * 保存非Gemini服务商的URL
     */
    saveNonGeminiUrl(providerKey, url) {
        if (providerKey !== 'gemini') {
            localStorage.setItem(`mobile_api_url_${providerKey}`, url);
        }
    }

    /**
     * 更新模型列表
     */
    updateModelList(models) {
        const modelSelect = document.getElementById('api-model');
        if (!modelSelect) return;

        modelSelect.innerHTML = '<option value="">选择模型...</option>';

        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            if (model === this.currentSettings.model) {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });
    }

    /**
     * 从UI更新设置
     */
    updateUIFromSettings() {
        const settings = this.currentSettings;

        // 更新各个字段
        const elements = {
            'api-enabled': settings.enabled,
            'api-provider': settings.provider,
            'api-url': settings.apiUrl,
            'api-key': settings.apiKey,
            'api-model': settings.model,
            'api-temperature': settings.temperature,
            'api-max-tokens': settings.maxTokens,
            'api-system-prompt': settings.systemPrompt,
            'api-auto-retry-truncated': settings.autoRetryTruncated
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        // 更新温度显示
        const tempValue = document.getElementById('temperature-value');
        if (tempValue) {
            tempValue.textContent = settings.temperature;
        }
    }

    /**
     * 从UI保存配置
     */
    async saveConfigFromUI() {
        try {
            const provider = document.getElementById('api-provider')?.value || 'openai';
            let apiUrl;

            if (provider === 'gemini') {
                // Gemini使用内置的URL
                apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
            } else {
                // 其他服务商从输入框获取URL并保存
                apiUrl = document.getElementById('api-url')?.value || '';
                this.saveNonGeminiUrl(provider, apiUrl);
            }

            // 收集UI数据
            const formData = {
                enabled: document.getElementById('api-enabled')?.checked || false,
                provider: provider,
                apiUrl: apiUrl,
                apiKey: document.getElementById('api-key')?.value || '',
                model: document.getElementById('api-model')?.value || '',
                temperature: parseFloat(document.getElementById('api-temperature')?.value || 0.8),
                maxTokens: parseInt(document.getElementById('api-max-tokens')?.value || 50000),
                systemPrompt: document.getElementById('api-system-prompt')?.value || '',
                autoRetryTruncated: document.getElementById('api-auto-retry-truncated')?.checked || false
            };

            // 验证必填字段
            const providerConfig = this.supportedProviders[formData.provider];
            if (providerConfig?.requiresKey && !formData.apiKey) {
                this.showStatus('❌ 请填写API密钥', 'error');
                return;
            }

            // 更新设置
            this.currentSettings = { ...this.currentSettings, ...formData };

            // 保存到localStorage
            const saved = await this.saveSettings();

            if (saved) {
                this.showStatus('✅ 配置已保存', 'success');
                setTimeout(() => {
                    this.hideConfigPanel();
                }, 1500);
            } else {
                this.showStatus('❌ 保存失败', 'error');
            }

        } catch (error) {
            console.error('[Mobile API Config] 保存配置失败:', error);
            this.showStatus('❌ 保存失败: ' + error.message, 'error');
        }
    }

    /**
     * 刷新模型列表
     */
    async refreshModels() {
        const provider = document.getElementById('api-provider')?.value || this.currentSettings.provider;
        let apiUrl;

        if (provider === 'gemini') {
            // Gemini使用内置的URL，不从输入框获取
            apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
        } else {
            // 其他服务商从输入框获取URL
            apiUrl = document.getElementById('api-url')?.value || '';
        }

        const apiKey = document.getElementById('api-key')?.value || '';

        console.log('[Mobile API Config] 开始刷新模型列表:', {
            provider,
            apiUrl: apiUrl ? '已设置' : '未设置',
            apiKey: apiKey ? '已设置' : '未设置',
            isGemini: provider === 'gemini'
        });

        if (!apiUrl) {
            this.showStatus('❌ 请先填写API URL', 'error');
            return;
        }

        if (!apiKey) {
            this.showStatus('❌ 请先填写API密钥', 'error');
            return;
        }

        this.showStatus('🔄 正在获取模型列表...', 'info');

        try {
            const models = await this.fetchModels(provider, apiUrl, apiKey);

            if (models && models.length > 0) {
                this.updateModelList(models);
                this.showStatus(`✅ 已获取 ${models.length} 个模型`, 'success');
                console.log('[Mobile API Config] 成功获取模型列表:', models);
            } else {
                // 使用默认模型列表
                const defaultModels = this.supportedProviders[provider]?.defaultModels || [];
                this.updateModelList(defaultModels);
                this.showStatus(`⚠️ 使用默认模型列表 (${defaultModels.length} 个)`, 'warning');
                console.warn('[Mobile API Config] 使用默认模型列表:', defaultModels);
            }
        } catch (error) {
            console.error('[Mobile API Config] 获取模型失败:', error);

            // 使用默认模型列表作为备选
            const defaultModels = this.supportedProviders[provider]?.defaultModels || [];
            if (defaultModels.length > 0) {
                this.updateModelList(defaultModels);
                this.showStatus(`⚠️ 网络请求失败，使用默认模型列表 (${defaultModels.length} 个)`, 'warning');
            } else {
                this.showStatus('❌ 获取模型失败: ' + error.message, 'error');
            }
        }
    }

        /**
     * 获取模型列表 (优化版本，使用缓存和智能配置选择)
     */
    async fetchModels(provider, apiUrl, apiKey) {
        const providerConfig = this.supportedProviders[provider];
        if (!providerConfig) {
            throw new Error('不支持的服务商');
        }

        // 生成缓存键
        const cacheKey = `${provider}_${apiUrl}_${apiKey ? 'hasKey' : 'noKey'}`;

        // 检查缓存的成功配置
        if (this.successfulConfigs.has(cacheKey)) {
            const cachedConfig = this.successfulConfigs.get(cacheKey);
            console.log(`[Mobile API Config] 🚀 使用缓存配置: ${cachedConfig.name}`);

            try {
                const models = await this.tryConfiguration(cachedConfig);
                if (models && models.length > 0) {
                    return models;
                }
                // 如果缓存的配置失效，清除缓存
                this.successfulConfigs.delete(cacheKey);
            } catch (error) {
                console.warn(`[Mobile API Config] 缓存配置失效: ${cachedConfig.name}`, error);
                this.successfulConfigs.delete(cacheKey);
            }
        }

        // 智能选择最可能成功的配置
        const configurationAttempts = this.getOptimalConfigurations(provider, apiUrl, apiKey);

        // 逐个尝试配置（但现在有了缓存，通常第一次后就会很快）
        for (const attempt of configurationAttempts) {
            try {
                console.log(`[Mobile API Config] 尝试配置: ${attempt.name}`);
                const models = await this.tryConfiguration(attempt);

                if (models && models.length > 0) {
                    // 缓存成功的配置
                    this.successfulConfigs.set(cacheKey, attempt);
                    console.log(`[Mobile API Config] ✅ 成功配置: "${attempt.name}", 找到 ${models.length} 个模型`);
                    return models;
                }
            } catch (error) {
                console.warn(`[Mobile API Config] 配置 "${attempt.name}" 发生异常:`, error);
                continue;
            }
        }

        // 如果所有配置都失败了
        console.error('[Mobile API Config] ❌ 所有配置尝试都失败了，使用默认模型列表');
        return providerConfig.defaultModels;
    }

    /**
     * 获取最优的配置尝试顺序
     */
    getOptimalConfigurations(provider, apiUrl, apiKey) {
        // 基于经验和成功率排序配置
        if (provider === 'gemini' || apiUrl.includes('gemini') || apiUrl.includes('beijixingxing')) {
            return [
                {
                    name: 'MakerSuite with reverse_proxy',
                    requestBody: {
                        chat_completion_source: 'makersuite',
                        reverse_proxy: apiUrl.trim(),
                        proxy_password: apiKey || ''
                    }
                },
                {
                    name: 'OpenAI-compatible for Gemini proxy',
                    requestBody: {
                        chat_completion_source: 'openai',
                        reverse_proxy: apiUrl.trim(),
                        proxy_password: apiKey || ''
                    }
                },
                {
                    name: 'Custom with Bearer for Gemini proxy',
                    requestBody: {
                        chat_completion_source: 'custom',
                        custom_url: apiUrl.trim(),
                        custom_include_headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
                    }
                }
            ];
        } else if (provider === 'backend_custom') {
            // 后端API - 通过SillyTavern后端代理
            return [
                {
                    name: 'Backend Custom with Bearer auth',
                    requestBody: {
                        chat_completion_source: 'custom',
                        custom_url: apiUrl.trim(),
                        custom_include_headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
                    }
                },
                {
                    name: 'Backend OpenAI with reverse_proxy',
                    requestBody: {
                        chat_completion_source: 'openai',
                        reverse_proxy: apiUrl.trim(),
                        proxy_password: apiKey || ''
                    }
                }
            ];
        } else if (provider === 'frontend_custom') {
            // 前端API - 直接调用，不通过后端（这里只是为了保持一致性，实际不会用到）
            return [
                {
                    name: 'Frontend Direct Call',
                    requestBody: null, // 前端直连不需要后端配置
                    isDirect: true
                }
            ];
        } else {
            // OpenAI 和其他后端代理API
            return [
                {
                    name: 'OpenAI with reverse_proxy',
                    requestBody: {
                        chat_completion_source: 'openai',
                        reverse_proxy: apiUrl.trim(),
                        proxy_password: apiKey || ''
                    }
                },
                {
                    name: 'Custom with Bearer auth',
                    requestBody: {
                        chat_completion_source: 'custom',
                        custom_url: apiUrl.trim(),
                        custom_include_headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
                    }
                }
            ];
        }
    }

    /**
     * 尝试单个配置
     */
    async tryConfiguration(attempt) {
        // 如果是前端直连配置
        if (attempt.isDirect) {
            return await this.tryDirectConfiguration(attempt);
        }

        // 后端代理配置
        // 获取请求头
        let headers = { 'Content-Type': 'application/json' };
        if (typeof getRequestHeaders === 'function') {
            headers = getRequestHeaders();
        }

        const response = await fetch('/api/backends/chat-completions/status', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(attempt.requestBody),
            timeout: 10000 // 10秒超时
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // 如果有严重错误（没有数据结构），抛出异常
        if (data.error && !data.data) {
            throw new Error(`API错误: ${data.error.message || data.error}`);
        }

        // 解析模型列表
        let models = [];
        const actualData = data.data?.data || data.data || data;

        if (actualData && Array.isArray(actualData)) {
            models = actualData.map(model => model.id || model.name);
        } else if (data.models && Array.isArray(data.models)) {
            models = data.models
                .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
                .map(model => model.name ? model.name.replace('models/', '') : model.id);
        } else if (Array.isArray(data)) {
            models = data.map(model => model.id || model.name || model);
        }

        return models.filter(model => typeof model === 'string' && model.length > 0);
    }

    /**
     * 尝试前端直连配置
     */
    async tryDirectConfiguration(attempt) {
        // 这里需要从当前UI获取配置
        const apiUrl = document.getElementById('api-url')?.value;
        const apiKey = document.getElementById('api-key')?.value;

        if (!apiUrl) {
            throw new Error('API URL 未设置');
        }

        // 构建模型列表请求URL
        let modelsUrl = apiUrl.trim();
        if (!modelsUrl.endsWith('/')) {
            modelsUrl += '/';
        }
        modelsUrl += 'models';

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json'
        };

        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // 直接调用API
        const response = await fetch(modelsUrl, {
            method: 'GET',
            headers: headers,
            timeout: 10000 // 10秒超时
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // 解析模型列表
        let models = [];
        if (data.data && Array.isArray(data.data)) {
            models = data.data.map(model => model.id || model.name);
        } else if (Array.isArray(data)) {
            models = data.map(model => model.id || model.name || model);
        }

        return models.filter(model => typeof model === 'string' && model.length > 0);
    }

    /**
     * 测试API连接
     */
    async testConnection() {
        const provider = document.getElementById('api-provider')?.value || this.currentSettings.provider;
        let apiUrl;

        if (provider === 'gemini') {
            // Gemini使用内置的URL，不从输入框获取
            apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
        } else {
            // 其他服务商从输入框获取URL
            apiUrl = document.getElementById('api-url')?.value || '';
        }

        const apiKey = document.getElementById('api-key')?.value || '';
        const model = document.getElementById('api-model')?.value || '';

        if (!apiUrl) {
            this.showStatus('❌ 请先填写API URL', 'error');
            return;
        }

        const providerConfig = this.supportedProviders[provider];
        if (providerConfig?.requiresKey && !apiKey) {
            this.showStatus('❌ 请先填写API密钥', 'error');
            return;
        }

        if (!model) {
            this.showStatus('❌ 请先选择模型', 'error');
            return;
        }

        this.showStatus('🧪 正在测试连接...', 'info');

        try {
            let result;
            if (provider === 'frontend_custom') {
                result = await this.testDirectAPICall(apiUrl, apiKey, model);
            } else {
                result = await this.testAPICall(provider, apiUrl, apiKey, model);
            }

            if (result.success) {
                this.showStatus('✅ 连接测试成功!', 'success');
            } else {
                this.showStatus('❌ 连接测试失败: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('[Mobile API Config] 连接测试失败:', error);
            this.showStatus('❌ 连接测试失败: ' + error.message, 'error');
        }
    }

    /**
     * 执行API测试调用
     */
    async testAPICall(provider, apiUrl, apiKey, model) {
        const providerConfig = this.supportedProviders[provider];

        // 构建请求URL
        let requestUrl = apiUrl.trim();
        if (!requestUrl.endsWith('/')) {
            requestUrl += '/';
        }

        // 根据不同服务商构建URL
        if (provider === 'gemini') {
            // Gemini API使用特殊的URL结构，并通过URL参数传递API key
            requestUrl += providerConfig.urlSuffix.replace('{model}', model);
            if (apiKey) {
                requestUrl += `?key=${apiKey}`;
            }
        } else {
            // OpenAI和自定义API使用标准URL构建
            requestUrl += providerConfig.urlSuffix.replace('{model}', model);
        }

        // 构建请求头
        const headers = { 'Content-Type': 'application/json' };

        // 根据服务商设置正确的认证方式
        if (providerConfig.requiresKey && apiKey && provider !== 'gemini') {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // 构建请求体
        const requestBody = this.buildTestRequestBody(provider, model);

        console.log('[Mobile API Config] 测试请求:', {
            provider: provider,
            url: requestUrl.replace(apiKey || '', '[HIDDEN]'),
            headers: { ...headers, Authorization: headers.Authorization ? 'Bearer [HIDDEN]' : undefined },
            body: requestBody
        });

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            timeout: 15000
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        }

        const data = await response.json();
        console.log('[Mobile API Config] 测试响应:', data);

        return { success: true, data: data };
    }

    /**
     * 执行前端直连API测试调用
     */
    async testDirectAPICall(apiUrl, apiKey, model) {
        // 构建请求URL
        let requestUrl = apiUrl.trim();
        if (!requestUrl.endsWith('/')) {
            requestUrl += '/';
        }
        requestUrl += 'chat/completions';

        // 构建请求头
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // 构建测试请求体
        const requestBody = {
            model: model,
            messages: [{ role: 'user', content: 'Hello! This is a test message from Mobile API Config.' }],
            max_tokens: 50,
            temperature: 0.7
        };

        console.log('[Mobile API Config] 前端直连测试请求:', {
            url: requestUrl.replace(apiKey || '', '[HIDDEN]'),
            headers: { ...headers, Authorization: headers.Authorization ? 'Bearer [HIDDEN]' : undefined },
            body: requestBody
        });

        try {
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                timeout: 15000
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { success: false, error: `HTTP ${response.status}: ${errorText}` };
            }

            const data = await response.json();
            console.log('[Mobile API Config] 前端直连测试响应:', data);

            return { success: true, data: data };
        } catch (error) {
            console.error('[Mobile API Config] 前端直连测试异常:', error);

            // 检查是否是CORS错误
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                return {
                    success: false,
                    error: `CORS错误或网络问题: ${error.message}。建议使用"后端API"选项。`
                };
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * 构建测试请求体 (OpenAI兼容格式)
     */
    buildTestRequestBody(provider, model) {
        const testMessage = "Hello! This is a test message from Mobile API Config.";

        if (provider === 'gemini') {
            // Gemini API格式
            return {
                contents: [{
                    parts: [{ text: testMessage }]
                }],
                generationConfig: {
                    maxOutputTokens: 50,
                    temperature: 0.7
                }
            };
        } else {
            // OpenAI兼容格式（用于OpenAI和自定义API）
            return {
                model: model,
                messages: [{ role: 'user', content: testMessage }],
                max_tokens: 50,
                temperature: 0.7
            };
        }
    }

    /**
     * 显示状态信息
     */
    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('api-config-status');
        if (!statusDiv) return;

        const colors = {
            info: '#17a2b8',
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107'
        };

        statusDiv.style.display = 'block';
        statusDiv.style.color = colors[type] || colors.info;
        statusDiv.textContent = message;

        // 自动隐藏成功消息
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * 获取当前API配置（供外部调用）
     */
    getCurrentConfig() {
        return { ...this.currentSettings };
    }

    /**
     * 执行API调用（供其他模块使用）
     */
    async callAPI(messages, options = {}) {
        if (!this.currentSettings.enabled) {
            throw new Error('自定义API未启用');
        }

        const provider = this.currentSettings.provider;
        let apiUrl;

        if (provider === 'gemini') {
            // Gemini使用内置的URL
            apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
        } else {
            // 其他服务商使用配置中的URL
            apiUrl = this.currentSettings.apiUrl || this.supportedProviders[provider]?.defaultUrl;
        }

        const apiKey = this.currentSettings.apiKey;
        const model = this.currentSettings.model;

        if (!apiUrl || !model) {
            throw new Error('API配置不完整');
        }

        const providerConfig = this.supportedProviders[provider];
        if (providerConfig?.requiresKey && !apiKey) {
            throw new Error('缺少API密钥');
        }

        // 判断是前端直连还是后端代理
        let result;
        const maxRetries = this.currentSettings.retryCount || 3;
        let retryCount = 0;

        while (retryCount <= maxRetries) {
            try {
                // 构建请求选项，如果是重试且启用了自动重试截断，增加token限制
                const requestOptions = { ...options };
                if (retryCount > 0 && this.currentSettings.autoRetryTruncated) {
                    requestOptions.max_tokens = this.currentSettings.truncationRetryMaxTokens || 60000;
                    console.log(`[Mobile API Config] 🔄 第${retryCount}次重试，使用更大的token限制: ${requestOptions.max_tokens}`);
                }

                if (provider === 'frontend_custom') {
                    console.log('[Mobile API Config] ⚡ 通过前端直接调用 API');
                    result = await this.callDirectAPI(apiUrl, apiKey, model, messages, requestOptions);
                } else {
                    console.log('[Mobile API Config] 🔗 通过 SillyTavern 后端代理发送 API 请求');
                    result = await this.callBackendAPI(provider, apiUrl, apiKey, model, messages, requestOptions);
                }

                // 检查是否需要重试（内容被截断且启用了自动重试）
                if (result.truncated && this.currentSettings.autoRetryTruncated && retryCount < maxRetries) {
                    console.warn(`[Mobile API Config] ⚠️ 响应被截断 (${result.truncationReason})，准备重试...`);
                    retryCount++;
                    continue;
                }

                // 返回结果
                return result;

            } catch (error) {
                retryCount++;
                console.error(`[Mobile API Config] ❌ API调用失败 (第${retryCount}次尝试):`, error.message);

                // 如果是最后一次尝试或非网络错误，直接抛出
                if (retryCount > maxRetries || !this.isRetryableError(error)) {
                    throw error;
                }

                // 等待重试延迟
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000); // 指数退避，最大10秒
                console.log(`[Mobile API Config] 🕐 等待 ${delay}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return result;
    }

    /**
     * 判断错误是否可以重试
     */
    isRetryableError(error) {
        const errorMessage = error.message.toLowerCase();

        // 网络相关错误
        const networkErrors = [
            'fetch',
            'network',
            'timeout',
            'connection',
            'aborted',
            'rate limit',
            'too many requests',
            'service unavailable',
            'bad gateway',
            'gateway timeout',
            'server error',
            'internal server error'
        ];

        // HTTP状态码相关的可重试错误
        const retryableHttpCodes = [429, 502, 503, 504];

        // 检查是否包含网络错误关键词
        const hasNetworkError = networkErrors.some(keyword =>
            errorMessage.includes(keyword)
        );

        // 检查是否包含可重试的HTTP状态码
        const hasRetryableHttpCode = retryableHttpCodes.some(code =>
            errorMessage.includes(code.toString()) || errorMessage.includes(`http ${code}`)
        );

        return hasNetworkError || hasRetryableHttpCode;
    }

    /**
     * 通过后端代理调用API
     */
    async callBackendAPI(provider, apiUrl, apiKey, model, messages, options) {

        // 生成缓存键
        const cacheKey = `${provider}_${apiUrl}_${apiKey ? 'hasKey' : 'noKey'}`;

        // 使用缓存的成功配置
        let requestBody;
        if (this.successfulConfigs.has(cacheKey)) {
            const cachedConfig = this.successfulConfigs.get(cacheKey);
            console.log(`[Mobile API Config] 🚀 使用缓存的API配置: ${cachedConfig.name}`);

            // 基于缓存配置构建请求体
            requestBody = {
                ...cachedConfig.requestBody,
                model: model,
                messages: messages,
                ...options
            };
        } else {
            // 如果没有缓存，使用默认逻辑（但建议先调用fetchModels建立缓存）
            console.warn('[Mobile API Config] ⚠️ 没有找到缓存配置，使用默认逻辑（建议先调用fetchModels）');

            if (provider === 'gemini' || apiUrl.includes('gemini') || apiUrl.includes('beijixingxing')) {
                if (apiUrl.includes('beijixingxing')) {
                    requestBody = {
                        chat_completion_source: 'openai',
                        reverse_proxy: apiUrl.trim(),
                        proxy_password: apiKey || '',
                        model: model,
                        messages: messages,
                        ...options
                    };
                } else {
                    requestBody = {
                        chat_completion_source: 'makersuite',
                        reverse_proxy: apiUrl.trim(),
                        proxy_password: apiKey || '',
                        model: model,
                        messages: messages,
                        ...options
                    };
                }
            } else if (provider === 'backend_custom') {
                // 后端自定义API
                requestBody = {
                    chat_completion_source: 'custom',
                    custom_url: apiUrl.trim(),
                    custom_include_headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
                    model: model,
                    messages: messages,
                    ...options
                };
            } else {
                // OpenAI 和其他标准API
                requestBody = {
                    chat_completion_source: 'openai',
                    reverse_proxy: apiUrl.trim(),
                    proxy_password: apiKey || '',
                    model: model,
                    messages: messages,
                    ...options
                };
            }
        }

        // 设置默认值
        requestBody.max_tokens = options.max_tokens || 30000;
        requestBody.temperature = options.temperature || 0.7;
        requestBody.stream = false; // 禁用流式响应以简化处理

        console.log('[Mobile API Config] 发送请求配置:', {
            provider,
            url: apiUrl,
            model,
            messageCount: messages.length,
            requestBody: { ...requestBody, proxy_password: requestBody.proxy_password ? '[HIDDEN]' : undefined }
        });

        try {
            // 获取请求头
            let headers = { 'Content-Type': 'application/json' };
            if (typeof getRequestHeaders === 'function') {
                headers = getRequestHeaders();
            }

            const response = await fetch('/api/backends/chat-completions/generate', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Mobile API Config] 后端代理请求失败:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`后端代理请求失败: HTTP ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('[Mobile API Config] ✅ 后端代理响应成功:', data);

            // 使用统一的响应解析方法
            return this.parseUnifiedResponse(data, model, 'backend');

        } catch (fetchError) {
            console.error('[Mobile API Config] ❌ 后端代理请求异常:', fetchError);

            // 详细的错误处理和用户友好的错误消息
            const userFriendlyError = this.createUserFriendlyError(fetchError, 'backend');
            throw new Error(userFriendlyError);
        }
    }

    /**
     * 创建用户友好的错误消息
     */
    createUserFriendlyError(error, callType) {
        const errorMessage = error.message.toLowerCase();

        // CORS错误（主要针对前端直连）
        if (callType === 'frontend' && (error.name === 'TypeError' && errorMessage.includes('failed to fetch'))) {
            return '前端直连失败: 可能是CORS错误或网络问题。建议：\n1. 使用"后端API"选项通过SillyTavern代理调用\n2. 确认API服务器支持跨域请求\n3. 检查网络连接状态';
        }

        // 网络连接错误
        if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
            return `网络连接问题: ${error.message}。建议：\n1. 检查网络连接\n2. 确认API服务器地址正确\n3. 尝试增加超时时间`;
        }

        // 认证错误
        if (errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorMessage.includes('invalid key')) {
            return `认证失败: API密钥可能无效或已过期。建议：\n1. 检查API密钥是否正确\n2. 确认密钥是否有足够的权限\n3. 检查账户余额是否充足`;
        }

        // 权限错误
        if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
            return `权限不足: ${error.message}。建议：\n1. 检查API密钥权限\n2. 确认服务商账户状态\n3. 联系服务商确认访问限制`;
        }

        // 限流错误
        if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests') || errorMessage.includes('429')) {
            return `请求频率限制: 已达到API调用限制。建议：\n1. 稍后重试\n2. 降低请求频率\n3. 升级服务商套餐`;
        }

        // 服务器错误
        if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504')) {
            return `服务器错误: ${error.message}。这通常是临时问题，建议：\n1. 稍后重试\n2. 检查服务商状态页面\n3. 尝试切换到其他服务商`;
        }

        // Token限制错误
        if (errorMessage.includes('token') && (errorMessage.includes('limit') || errorMessage.includes('exceed'))) {
            return `Token限制错误: ${error.message}。建议：\n1. 减少输入文本长度\n2. 增加maxTokens设置\n3. 分段发送长文本`;
        }

        // 模型不存在错误
        if (errorMessage.includes('model') && (errorMessage.includes('not found') || errorMessage.includes('does not exist'))) {
            return `模型不存在: ${error.message}。建议：\n1. 刷新模型列表\n2. 选择其他可用模型\n3. 检查服务商支持的模型列表`;
        }

        // JSON格式错误
        if (errorMessage.includes('json') || errorMessage.includes('parse')) {
            return `数据格式错误: API返回了无效的JSON格式。建议：\n1. 检查API服务器状态\n2. 确认请求参数正确\n3. 稍后重试`;
        }

        // 默认错误处理
        return `${callType === 'frontend' ? '前端直连' : '后端代理'}调用失败: ${error.message}`;
    }

    /**
     * 通过前端直接调用API
     */
    async callDirectAPI(apiUrl, apiKey, model, messages, options) {
        // 构建请求URL
        let requestUrl = apiUrl.trim();
        if (!requestUrl.endsWith('/')) {
            requestUrl += '/';
        }
        requestUrl += 'chat/completions';

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json'
        };

        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        // 构建请求体 (OpenAI兼容格式)
        const requestBody = {
            model: model,
            messages: messages,
            max_tokens: options.max_tokens || this.currentSettings.maxTokens || 30000,
            temperature: options.temperature || this.currentSettings.temperature || 0.7,
            stream: false, // 禁用流式响应以简化处理
            ...options
        };

        // 添加系统提示词
        if (this.currentSettings.systemPrompt) {
            requestBody.messages = [
                { role: 'system', content: this.currentSettings.systemPrompt },
                ...requestBody.messages
            ];
        }

        console.log('[Mobile API Config] 发送前端直连请求:', {
            url: requestUrl,
            model,
            messageCount: messages.length,
            hasApiKey: !!apiKey
        });

        try {
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                timeout: 30000 // 30秒超时
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Mobile API Config] 前端直连请求失败:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`前端直连请求失败: HTTP ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('[Mobile API Config] ✅ 前端直连响应成功:', data);

            // 使用统一的响应解析方法
            return this.parseUnifiedResponse(data, model, 'frontend');

        } catch (fetchError) {
            console.error('[Mobile API Config] ❌ 前端直连请求异常:', fetchError);

            // 详细的错误处理和用户友好的错误消息
            const userFriendlyError = this.createUserFriendlyError(fetchError, 'frontend');
            throw new Error(userFriendlyError);
        }
    }

    /**
     * 构建API请求体 (OpenAI兼容格式)
     */
    buildRequestBody(provider, model, messages, options) {
        const settings = this.currentSettings;

        if (provider === 'gemini') {
            // Gemini API格式
            const contents = [];

            // 转换消息格式
            messages.forEach(msg => {
                if (msg.role === 'system') {
                    // 系统消息作为第一个用户消息的前缀
                    if (contents.length === 0) {
                        contents.push({
                            parts: [{ text: msg.content + '\n\n' }]
                        });
                    }
                } else if (msg.role === 'user') {
                    const existingText = contents.length > 0 ? contents[contents.length - 1].parts[0].text : '';
                    if (contents.length > 0 && !contents[contents.length - 1].role) {
                        // 合并到现有的系统消息中
                        contents[contents.length - 1].parts[0].text = existingText + msg.content;
                    } else {
                        contents.push({
                            parts: [{ text: msg.content }]
                        });
                    }
                } else if (msg.role === 'assistant') {
                    contents.push({
                        role: 'model',
                        parts: [{ text: msg.content }]
                    });
                }
            });

            // 添加系统提示词
            if (settings.systemPrompt && contents.length === 0) {
                contents.push({
                    parts: [{ text: settings.systemPrompt }]
                });
            }

            // 统一参数映射：max_tokens 或 maxTokens 都映射到 maxOutputTokens
            // Gemini 限制：1-65536（不包含65537），安全值设为 8000
            const requestedTokens = options.max_tokens || options.maxTokens || settings.maxTokens || 8000;
            const maxOutputTokens = Math.min(requestedTokens, 8000);

            return {
                contents: contents,
                generationConfig: {
                    maxOutputTokens: maxOutputTokens,
                    temperature: options.temperature || settings.temperature,
                    ...options.customParams
                }
            };
        } else {
            // OpenAI兼容格式（用于OpenAI和自定义API）
            const body = {
                model: model,
                messages: messages,
                max_tokens: options.maxTokens || settings.maxTokens,
                temperature: options.temperature || settings.temperature,
                ...options.customParams
            };

            // 添加系统提示词
            if (settings.systemPrompt) {
                body.messages = [
                    { role: 'system', content: settings.systemPrompt },
                    ...body.messages
                ];
            }

            return body;
        }
    }

    /**
     * 统一的响应解析方法 - 处理各种API格式和异常情况
     */
    parseUnifiedResponse(data, model, callType = 'unknown') {
        console.log(`[Mobile API Config] 🔍 解析${callType}响应:`, data);

        // 1. 检查明确的错误
        if (data.error) {
            const errorMsg = data.error.message || data.error.code || data.error;
            throw new Error(`API错误: ${errorMsg}`);
        }

        // 2. 尝试多种响应格式解析
        let content = '';
        let usage = null;
        let finishReason = null;
        let responseModel = model;

        // 格式1: OpenAI标准格式和DeepSeek格式
        if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
            const choice = data.choices[0];
            // 支持多种DeepSeek和OpenAI格式的内容提取路径
            content = choice.message?.content ||
                     choice.text ||
                     choice.content ||  // DeepSeek可能直接在choice下有content
                     choice.delta?.content ||
                     choice.response ||  // 某些变体可能使用response
                     '';
            finishReason = choice.finish_reason;
            usage = data.usage;
            responseModel = data.model || model;

            // 如果仍然没有内容，尝试更深层的提取
            if (!content && choice.message) {
                // 尝试提取message对象的其他可能字段
                content = choice.message.text ||
                         choice.message.response ||
                         choice.message.content || '';
            }

            // 如果还是没有内容，记录详细的choice结构用于调试
            if (!content) {
                console.warn('[Mobile API Config] 🔍 DeepSeek响应choice详细结构:', {
                    choiceKeys: Object.keys(choice || {}),
                    messageKeys: choice.message ? Object.keys(choice.message) : null,
                    choiceStructure: choice,
                    hasMessage: !!choice.message,
                    hasContent: !!choice.content,
                    hasText: !!choice.text,
                    hasResponse: !!choice.response,
                    messageContent: choice.message?.content,
                    messageText: choice.message?.text
                });
            }
        }
        // 格式2: Gemini API格式
        else if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            content = candidate.content?.parts?.[0]?.text || '';
            finishReason = candidate.finishReason;
            usage = data.usageMetadata;
        }
        // 格式3: 直接内容格式
        else if (data.content && typeof data.content === 'string') {
            content = data.content;
            usage = data.usage;
            responseModel = data.model || model;
        }
        // 格式4: 某些API的text字段
        else if (data.text && typeof data.text === 'string') {
            content = data.text;
            usage = data.usage;
        }
        // 格式5: response字段
        else if (data.response && typeof data.response === 'string') {
            content = data.response;
        }
        // 格式6: 嵌套的data字段
        else if (data.data) {
            return this.parseUnifiedResponse(data.data, model, callType);
        }

        // 3. 验证内容
        if (!content || typeof content !== 'string') {
            console.warn('[Mobile API Config] ⚠️ 响应格式异常，尝试整体解析:', data);

            // 最后尝试：如果是字符串，直接使用
            if (typeof data === 'string') {
                content = data;
            } else if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
                // 对于DeepSeek等特殊格式，尝试更广泛的内容搜索
                const choice = data.choices[0];
                console.warn('[Mobile API Config] 🔍 尝试从choice中提取任何可能的文本内容...');

                // 递归搜索choice对象中的任何文本内容
                function findTextContent(obj, depth = 0) {
                    if (depth > 3) return null; // 防止过深递归
                    if (typeof obj === 'string' && obj.trim().length > 0) {
                        return obj;
                    }
                    if (obj && typeof obj === 'object') {
                        for (const [key, value] of Object.entries(obj)) {
                            if (key.toLowerCase().includes('content') ||
                                key.toLowerCase().includes('text') ||
                                key.toLowerCase().includes('response') ||
                                key.toLowerCase().includes('message')) {
                                const found = findTextContent(value, depth + 1);
                                if (found) return found;
                            }
                        }
                    }
                    return null;
                }

                const foundContent = findTextContent(choice);
                if (foundContent) {
                    console.log('[Mobile API Config] ✅ 在choice中找到内容!');
                    content = foundContent;
                } else {
                    // 记录详细信息用于调试
                    console.error('[Mobile API Config] 📋 响应结构分析:', {
                        hasChoices: !!data.choices,
                        choicesLength: data.choices?.length,
                        hasCandidates: !!data.candidates,
                        candidatesLength: data.candidates?.length,
                        hasContent: !!data.content,
                        hasText: !!data.text,
                        hasResponse: !!data.response,
                        hasData: !!data.data,
                        keys: Object.keys(data || {}),
                        firstChoiceKeys: choice ? Object.keys(choice) : null
                    });

                    throw new Error(`无法解析API响应格式。响应键: [${Object.keys(data || {}).join(', ')}]`);
                }
            } else {
                // 记录详细信息用于调试
                console.error('[Mobile API Config] 📋 响应结构分析:', {
                    hasChoices: !!data.choices,
                    choicesLength: data.choices?.length,
                    hasCandidates: !!data.candidates,
                    candidatesLength: data.candidates?.length,
                    hasContent: !!data.content,
                    hasText: !!data.text,
                    hasResponse: !!data.response,
                    hasData: !!data.data,
                    keys: Object.keys(data || {})
                });

                throw new Error(`无法解析API响应格式。响应键: [${Object.keys(data || {}).join(', ')}]`);
            }
        }

        // 4. 验证和格式化内容
        const validationResult = this.validateAndFormatResponse(content);
        content = validationResult.content;

        // 5. 检查内容截断
        const isTruncated = this.checkContentTruncation(content, finishReason, usage);
        if (isTruncated.truncated) {
            console.warn(`[Mobile API Config] ⚠️ 检测到内容可能被截断: ${isTruncated.reason}`);
        }

        // 6. 返回标准格式
        const result = {
            content: content,
            usage: usage,
            model: responseModel,
            finishReason: finishReason,
            truncated: isTruncated.truncated,
            truncationReason: isTruncated.reason,
            // 添加验证和格式化信息
            formatted: validationResult.formatted,
            quality: validationResult.quality,
            warnings: validationResult.warnings
        };

        console.log(`[Mobile API Config] ✅ 成功解析${callType}响应:`, {
            contentLength: result.content.length,
            model: result.model,
            finishReason: result.finishReason,
            truncated: result.truncated,
            quality: result.quality,
            formatted: result.formatted,
            warningCount: result.warnings.length,
            usage: result.usage
        });

        // 如果有警告，显示详细信息
        if (result.warnings.length > 0) {
            console.warn(`[Mobile API Config] ⚠️ 响应质量警告:`, result.warnings);
        }

        return result;
    }

    /**
     * 验证和格式化响应内容
     */
    validateAndFormatResponse(content) {
        const warnings = [];
        let quality = 'good';
        let formatted = false;
        let processedContent = content;

        // 1. 基本验证
        if (!processedContent || typeof processedContent !== 'string') {
            return {
                content: '',
                formatted: false,
                quality: 'bad',
                warnings: ['响应内容为空或格式无效']
            };
        }

        // 2. 移除常见的API错误标记
        const errorPatterns = [
            /^Error:/i,
            /^API Error:/i,
            /^错误:/,
            /^API错误:/
        ];

        for (const pattern of errorPatterns) {
            if (pattern.test(processedContent)) {
                warnings.push('响应中包含错误标记');
                quality = 'poor';
                break;
            }
        }

        // 3. 清理多余的空白字符
        const originalContent = processedContent;
        processedContent = processedContent
            .replace(/\r\n/g, '\n')           // 统一换行符
            .replace(/\n{3,}/g, '\n\n')      // 最多保留两个连续换行
            .replace(/[ \t]+\n/g, '\n')      // 移除行尾空格
            .replace(/^\s+|\s+$/g, '');       // 移除首尾空白

        if (processedContent !== originalContent) {
            formatted = true;
        }

        // 4. 检查内容质量
        if (processedContent.length === 0) {
            quality = 'bad';
            warnings.push('响应内容为空');
        } else if (processedContent.length < 10) {
            quality = 'poor';
            warnings.push('响应内容过短，可能不完整');
        } else {
            // 检查是否有异常的重复内容
            const words = processedContent.split(/\s+/);
            const uniqueWords = new Set(words);

            if (words.length > 50 && uniqueWords.size < words.length * 0.3) {
                quality = 'poor';
                warnings.push('响应中存在大量重复内容');
            }

            // 检查是否有正常的句子结构
            const sentences = processedContent.split(/[.!?。！？]/);
            if (sentences.length === 1 && processedContent.length > 100) {
                quality = 'poor';
                warnings.push('响应缺少标点符号，可能是不完整的输出');
            }
        }

        // 5. 检查编码问题
        if (/[���]/.test(processedContent)) {
            quality = 'poor';
            warnings.push('响应内容存在编码问题');
        }

        // 6. 检查是否是模型拒绝回答
        const refusalPatterns = [
            /I cannot|I can't|I'm not able to/i,
            /我不能|我无法|抱歉/,
            /sorry.*cannot/i,
            /against.*policy/i
        ];

        for (const pattern of refusalPatterns) {
            if (pattern.test(processedContent) && processedContent.length < 500) {
                warnings.push('模型可能拒绝了请求');
                break;
            }
        }

        return {
            content: processedContent,
            formatted: formatted,
            quality: quality,
            warnings: warnings
        };
    }

    /**
     * 检查内容截断
     */
    checkContentTruncation(content, finishReason, usage) {
        // 1. 检查finishReason
        if (finishReason === 'length' || finishReason === 'max_tokens') {
            return {
                truncated: true,
                reason: '达到最大token限制'
            };
        }

        // 2. 检查usage信息
        if (usage) {
            const totalTokens = usage.total_tokens || usage.totalTokens;
            const maxTokens = this.currentSettings.maxTokens || 30000;

            if (totalTokens && totalTokens >= maxTokens * 0.95) {
                return {
                    truncated: true,
                    reason: `接近token限制 (${totalTokens}/${maxTokens})`
                };
            }
        }

        // 3. 检查内容是否突然结束
        if (content.length > 100) {
            const lastSentences = content.slice(-200);
            // 如果内容不是以正常的句号、问号、感叹号结尾，可能被截断
            if (!/[。！？.!?][\s]*$/.test(lastSentences.trim())) {
                // 进一步检查是否是在句子中间断开
                const lastWords = content.trim().split(/\s+/).slice(-3);
                if (lastWords.some(word => word.length < 2)) {
                    return {
                        truncated: true,
                        reason: '内容可能在单词中间被截断'
                    };
                }
            }
        }

        return {
            truncated: false,
            reason: null
        };
    }

    /**
     * 解析API响应 (兼容旧版本)
     */
    parseAPIResponse(provider, data) {
        return this.parseUnifiedResponse(data, null, provider);
    }

    /**
     * 检查API是否可用
     */
    isAPIAvailable() {
        return this.currentSettings.enabled &&
               this.currentSettings.apiUrl &&
               this.currentSettings.model &&
               (
                   !this.supportedProviders[this.currentSettings.provider]?.requiresKey ||
                   this.currentSettings.apiKey
               );
    }

    /**
     * 获取调试信息
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentSettings: { ...this.currentSettings, apiKey: this.currentSettings.apiKey ? '[HIDDEN]' : '' },
            supportedProviders: Object.keys(this.supportedProviders),
            isAPIAvailable: this.isAPIAvailable(),
            providerConfig: this.supportedProviders[this.currentSettings.provider] || null
        };
    }

    /**
     * 清理配置缓存
     */
    clearConfigCache() {
        this.successfulConfigs.clear();
        console.log('[Mobile API Config] 🗑️ 配置缓存已清理');
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        return {
            cacheSize: this.successfulConfigs.size,
            cachedConfigs: Array.from(this.successfulConfigs.keys())
        };
    }

    /**
     * 调试函数：检查当前配置状态
     */
    debugConfig() {
        console.group('🔧 [Mobile API Config] 配置调试信息');
        console.log('✅ 初始化状态:', this.isInitialized);
        console.log('📋 当前设置:', {
            provider: this.currentSettings.provider,
            providerName: this.supportedProviders[this.currentSettings.provider]?.name || '未知',
            enabled: this.currentSettings.enabled,
            apiUrl: this.currentSettings.apiUrl || '(未设置)',
            hasApiKey: !!this.currentSettings.apiKey,
            model: this.currentSettings.model || '(未设置)',
            temperature: this.currentSettings.temperature,
            maxTokens: this.currentSettings.maxTokens,
            isFrontendDirect: this.currentSettings.provider === 'frontend_custom'
        });
        console.log('🌐 支持的服务商:', Object.keys(this.supportedProviders));
        console.log('⚙️ 当前Provider配置:', this.supportedProviders[this.currentSettings.provider]);
        console.log('🔗 API可用性:', this.isAPIAvailable());

        // 获取当前UI中的值
        const currentProvider = document.getElementById('api-provider')?.value;
        const currentUrl = document.getElementById('api-url')?.value;
        const currentKey = document.getElementById('api-key')?.value;

        console.log('🔧 UI元素状态:', {
            'api-provider': currentProvider || '(未找到)',
            'api-url': currentUrl || '(未找到)',
            'api-key': document.getElementById('api-key') ? (currentKey ? '已填写' : '未填写') : '(未找到)',
            'api-model': document.getElementById('api-model')?.value || '(未找到)'
        });

        // 测试URL构建
        const provider = currentProvider || this.currentSettings.provider || 'gemini';
        const apiUrl = currentUrl || this.currentSettings.apiUrl || this.supportedProviders[provider]?.defaultUrl;
        if (apiUrl) {
            const modelsUrl = this.buildModelsUrl(provider, apiUrl);
            console.log('🔗 当前Provider:', provider);
            console.log('🔗 基础URL:', apiUrl);
            console.log('🔗 预期的模型URL:', modelsUrl);

            // 检查URL是否正确
            if (provider === 'gemini' && !modelsUrl.includes('v1beta')) {
                console.warn('⚠️ 警告: Gemini URL应该包含v1beta，当前URL可能不正确');
            }
        }

        console.groupEnd();
    }

    /**
     * 构建模型列表URL（用于调试）
     */
    buildModelsUrl(provider, apiUrl) {
        let modelsUrl = apiUrl.trim();
        if (!modelsUrl.endsWith('/')) {
            modelsUrl += '/';
        }

        if (provider === 'gemini') {
            if (!modelsUrl.includes('/v1beta/models')) {
                if (modelsUrl.endsWith('/v1/')) {
                    modelsUrl = modelsUrl.replace('/v1/', '/v1beta/models');
                } else {
                    modelsUrl += 'v1beta/models';
                }
            }
        } else {
            if (modelsUrl.endsWith('/v1/')) {
                modelsUrl += 'models';
            } else if (!modelsUrl.includes('/models')) {
                modelsUrl += 'models';
            }
        }

        return modelsUrl;
    }

    /**
     * 手动测试模型获取（调试用）
     */
    async testModelFetch() {
        console.log('[Mobile API Config] 🧪 开始手动测试模型获取...');

        const provider = document.getElementById('api-provider')?.value || this.currentSettings.provider;
        const apiUrl = document.getElementById('api-url')?.value || this.currentSettings.apiUrl;
        const apiKey = document.getElementById('api-key')?.value || this.currentSettings.apiKey;

        console.log('测试参数:', { provider, apiUrl: apiUrl ? '已设置' : '未设置', apiKey: apiKey ? '已设置' : '未设置' });

        if (!apiUrl || !apiKey) {
            console.error('缺少必要参数');
            return;
        }

        try {
            const models = await this.fetchModels(provider, apiUrl, apiKey);
            console.log('✅ 测试成功，获取到模型:', models);
            return models;
        } catch (error) {
            console.error('❌ 测试失败:', error);
            return null;
        }
    }
}

// 自动初始化
jQuery(document).ready(() => {
    // 等待一小段时间确保其他模块加载完成
    setTimeout(() => {
        if (!window.mobileCustomAPIConfig) {
            const apiConfig = new MobileCustomAPIConfig();
            apiConfig.initialize().then(success => {
                if (success) {
                    console.log('[Mobile API Config] ✅ 自定义API配置模块已就绪');
                } else {
                    console.error('[Mobile API Config] ❌ 自定义API配置模块初始化失败');
                }
            });
            // 将实例设置为全局变量
            window.mobileCustomAPIConfig = apiConfig;
        }
    }, 1000);
});

// 导出类和实例到全局作用域
window.MobileCustomAPIConfig = MobileCustomAPIConfig;

// 全局辅助函数

/**
 * 测试响应解析和验证功能
 */
window.testResponseParsing = function(sampleData) {
    console.log('🧪 测试响应解析功能...');

    const config = window.mobileCustomAPIConfig;
    if (!config) {
        console.error('❌ API配置管理器未初始化');
        return;
    }

    // 测试数据样例
    const testCases = sampleData || [
        {
            name: 'OpenAI标准格式',
            data: {
                choices: [{ message: { content: '这是一个测试响应。' } }],
                usage: { total_tokens: 100 },
                model: 'gpt-3.5-turbo'
            }
        },
        {
            name: 'Gemini格式',
            data: {
                candidates: [{ content: { parts: [{ text: '这是Gemini的测试响应。' }] } }],
                usageMetadata: { totalTokens: 80 }
            }
        },
        {
            name: '直接内容格式',
            data: {
                content: '直接返回的内容测试。',
                model: 'test-model'
            }
        },
        {
            name: '截断响应测试',
            data: {
                choices: [{
                    message: { content: '这是一个被截断的响应...' },
                    finish_reason: 'length'
                }],
                usage: { total_tokens: 50000 }
            }
        },
        {
            name: '错误响应测试',
            data: {
                error: { message: 'API密钥无效' }
            }
        }
    ];

    testCases.forEach(testCase => {
        console.log(`\n📋 测试用例: ${testCase.name}`);
        try {
            const result = config.parseUnifiedResponse(testCase.data, 'test-model', 'test');
            console.log('✅ 解析成功:', {
                contentLength: result.content.length,
                quality: result.quality,
                truncated: result.truncated,
                warnings: result.warnings
            });
            if (result.content.length < 100) {
                console.log('📝 内容预览:', result.content);
            }
        } catch (error) {
            console.log('❌ 解析失败:', error.message);
        }
    });
};

/**
 * 检查API配置的完整性
 */
window.checkAPIHealth = function() {
    console.log('🏥 开始API健康检查...');

    const config = window.mobileCustomAPIConfig;
    if (!config) {
        console.error('❌ API配置管理器未初始化');
        return;
    }

    const health = {
        initialized: config.isInitialized,
        enabled: config.currentSettings.enabled,
        hasProvider: !!config.currentSettings.provider,
        hasUrl: !!config.currentSettings.apiUrl,
        hasKey: !!config.currentSettings.apiKey,
        hasModel: !!config.currentSettings.model,
        cacheSize: config.getCacheStats().cacheSize,
        issues: []
    };

    // 检查各项配置
    if (!health.initialized) health.issues.push('配置管理器未完成初始化');
    if (!health.enabled) health.issues.push('自定义API未启用');
    if (!health.hasProvider) health.issues.push('未选择API服务商');
    if (!health.hasUrl && config.currentSettings.provider !== 'gemini') health.issues.push('未设置API URL');
    if (!health.hasKey) health.issues.push('未设置API密钥');
    if (!health.hasModel) health.issues.push('未选择模型');

    // Token限制检查
    const maxTokens = config.currentSettings.maxTokens || 0;
    if (maxTokens < 10000) health.issues.push('Token限制设置过低，建议至少10000');
    if (maxTokens > 100000) health.issues.push('Token限制设置很高，请确认服务商支持');

    console.log('📊 健康检查结果:', health);

    if (health.issues.length === 0) {
        console.log('✅ API配置看起来很健康！');
    } else {
        console.warn('⚠️ 发现以下问题:');
        health.issues.forEach((issue, index) => {
            console.warn(`  ${index + 1}. ${issue}`);
        });
    }

    return health;
};

/**
 * 修复Gemini配置
 */
window.fixGeminiConfig = function() {
    console.log('🔧 正在修复Gemini配置...');

    const config = window.mobileCustomAPIConfig;
    if (!config) {
        console.error('❌ API配置管理器未初始化');
        return;
    }

    // 强制设置正确的Gemini配置
    const providerSelect = document.getElementById('api-provider');

    if (providerSelect) {
        providerSelect.value = 'gemini';
    }

    // 触发provider change事件（这会自动隐藏URL输入框并设置内置URL）
    config.onProviderChange('gemini');

    console.log('✅ 配置已修复，请确保：');
    console.log('1. 已选择💎 Google Gemini服务商');
    console.log('2. URL输入框已隐藏（使用内置URL）');
    console.log('3. API密钥: 以AIza开头的Google AI API密钥');
    console.log('4. 点击📥按钮获取模型列表');

    // 显示调试信息
    config.debugConfig();
};

// 添加控制台提示
console.log(`
🚀 [Mobile API Config] 可用的调试命令:

   基础配置：
   查看配置状态: window.mobileCustomAPIConfig.debugConfig()
   检查API健康: window.checkAPIHealth()
   修复Gemini配置: window.fixGeminiConfig()

   测试功能：
   手动测试获取: await window.mobileCustomAPIConfig.testModelFetch()
   测试响应解析: window.testResponseParsing()

   缓存管理：
   清理配置缓存: window.mobileCustomAPIConfig.clearConfigCache()
   查看缓存统计: window.mobileCustomAPIConfig.getCacheStats()

   ✨ 新功能说明：
   - 支持多种响应格式自动识别和解析
   - 内容截断检测和自动重试
   - 响应质量验证和格式化
   - 智能错误处理和用户友好的错误提示
   - 提高默认Token限制以减少截断问题
`);
