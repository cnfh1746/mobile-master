
/**
 * 手机前端框架
 * 可爱的iOS风格手机界面
 */

class MobilePhone {
    constructor() {
        this.isVisible = false;
        this.currentApp = null;
        this.apps = {};
        this.appStack = []; // 添加应用栈来管理页面导航
        this.currentAppState = null; // 当前应用状态
        this.dragHelper = null; // 拖拽辅助器（按钮）
        this.frameDragHelper = null; // 框架拖拽辅助器

        // 防抖相关标记
        this._openingApp = null;
        this._goingHome = false;
        this._returningToApp = null;
        this._lastAppIconClick = 0;
        this._lastBackButtonClick = 0;

        // 应用加载状态管理
        this._loadingApps = new Set(); // 正在加载的应用
        this._userNavigationIntent = null; // 用户导航意图
        this._loadingStartTime = {}; // 应用加载开始时间

        this.init();
    }

    init() {
        this.loadDragHelper();
        this.clearPositionCache(); // 清理位置缓存
        this.createPhoneButton();
        this.createPhoneContainer();
        this.registerApps();
        this.startClock();
        this.initPageSwipe(); // 初始化页面拖拽功能

        // 初始化文字颜色设置
        setTimeout(() => {
            this.initTextColor();
        }, 1000); // 延迟初始化，确保页面加载完成
    }

    // 初始化页面拖拽功能
    initPageSwipe() {
        this.currentPageIndex = 0;
        this.totalPages = 2;
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.threshold = 50; // 拖拽阈值

        // 等待DOM元素加载完成
        setTimeout(() => {
            const wrapper = document.getElementById('app-pages-wrapper');
            const indicators = document.getElementById('page-indicators');

            if (!wrapper || !indicators) {
                console.log('[Mobile Phone] 页面元素未找到，延迟初始化拖拽功能');
                setTimeout(() => this.initPageSwipe(), 100);
                return;
            }

            // 鼠标事件 (PC端)
            wrapper.addEventListener('mousedown', this.handleStart.bind(this));
            wrapper.addEventListener('mousemove', this.handleMove.bind(this));
            wrapper.addEventListener('mouseup', this.handleEnd.bind(this));
            wrapper.addEventListener('mouseleave', this.handleEnd.bind(this));

            // 触摸事件 (移动端)
            wrapper.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
            wrapper.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
            wrapper.addEventListener('touchend', this.handleEnd.bind(this));

            // 指示器点击事件
            const indicatorElements = indicators.querySelectorAll('.indicator');
            indicatorElements.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    this.goToPage(index);
                });
            });

            console.log('[Mobile Phone] 页面拖拽功能初始化完成');
        }, 100);
    }

    // 处理删除朋友圈
    async handleDeleteFriendsCircle() {
        const confirmed = confirm('将永久删除最旧的30条朋友圈内容，此操作不可恢复。是否继续？');
        if (!confirmed) return;

        MobilePhone.showToast('🔄 正在删除朋友圈内容...', 'processing');

        try {
            const deletedCount = await this.deleteOldFriendsCirclePosts(30);
            MobilePhone.showToast(`✅ 已成功删除 ${deletedCount} 条朋友圈。`, 'success');
        } catch (error) {
            console.error('[Mobile Phone] 删除朋友圈失败:', error);
            MobilePhone.showToast(`❌ 删除失败: ${error.message}`, 'error');
        }
    }

    // 删除旧的朋友圈帖子
    async deleteOldFriendsCirclePosts(count) {
        const allPosts = this.parseAllFriendsCirclePosts();
        if (allPosts.length === 0) {
            return 0;
        }

        // 按楼层ID排序（从旧到新）
        allPosts.sort((a, b) => a.id - b.id);

        const postsToDelete = allPosts.slice(0, count);
        if (postsToDelete.length === 0) {
            return 0;
        }

        await this.updateMessagesAfterDeletion(postsToDelete);
        return postsToDelete.length;
    }

    // 解析所有朋友圈帖子
    parseAllFriendsCirclePosts() {
        const chatData = this.getChatData();
        if (!chatData) return [];

        const posts = [];
        const postRegex = /^\[w\|(\d+)\|/gm; // 匹配 [w|楼层id|

        for (let i = 0; i < chatData.length; i++) {
            const msg = chatData[i];
            const content = msg.mes || '';
            let match;
            while ((match = postRegex.exec(content)) !== null) {
                posts.push({ 
                    id: parseInt(match[1]), 
                    msgIndex: i, 
                    fullMatch: content.substring(match.index, content.indexOf(']', match.index) + 1)
                });
            }
        }
        return posts;
    }

    // 更新消息内容
    async updateMessagesAfterDeletion(postsToDelete) {
        const chatData = this.getChatData();
        let hasChanges = false;

        for (const post of postsToDelete) {
            const msg = chatData[post.msgIndex];
            if (msg && msg.mes) {
                const deletedPost = post.fullMatch.replace('[w|', '[已删除|');
                msg.mes = msg.mes.replace(post.fullMatch, deletedPost);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            if (window.chat_metadata) {
                window.chat_metadata.tainted = true;
            }
            await this.saveChat();
        }
    }

    // 获取聊天数据
    getChatData() {
        try {
            const mobileContextEditor = window['mobileContextEditor'];
            if (mobileContextEditor) {
                const chatData = mobileContextEditor.getCurrentChatData();
                if (chatData && chatData.messages && chatData.messages.length > 0) {
                    return chatData.messages;
                }
            }
            const chat = window['chat'];
            if (chat && Array.isArray(chat)) {
                return chat;
            }
            return [];
        } catch (error) {
            console.error('[Mobile Phone] 获取聊天数据失败:', error);
            return [];
        }
    }

    // 保存聊天
    async saveChat() {
        if (typeof window.saveChatConditional === 'function') {
            await window.saveChatConditional();
        }
    }

    // 注册应用
    registerApps() {
        this.apps = {
            messages: {
                name: '信息',
                content: null, // 将由message-app动态生成
                isCustomApp: true,
                customHandler: this.handleMessagesApp.bind(this),
            },
            gallery: {
                name: '相册',
                content: `
                    <div class="gallery-app">
                        <div class="photo-grid">
                            <div class="photo-item">🖼️</div>
                            <div class="photo-item">🌸</div>
                            <div class="photo-item">🌙</div>
                            <div class="photo-item">⭐</div>
                            <div class="photo-item">🎀</div>
                            <div class="photo-item">💐</div>
                        </div>
                    </div>
                `,
            },
            settings: {
                name: '设置',
                content: null, // 将由样式配置管理器动态生成
                isCustomApp: true,
                customHandler: this.handleSettingsApp.bind(this),
            },
            forum: {
                name: '论坛',
                content: null, // 将由论坛UI动态生成
                isCustomApp: true,
                customHandler: this.handleForumApp.bind(this),
            },
            weibo: {
                name: '微博',
                content: null, // 将由微博UI动态生成
                isCustomApp: true,
                customHandler: this.handleWeiboApp.bind(this),
            },
            api: {
                name: 'API设置',
                content: null, // 将由统一API设置面板动态生成
                isCustomApp: true,
                customHandler: this.handleApiApp.bind(this),
            },
            diary: {
                name: '日记',
                content: `
                    <div class="diary-app">
                        <div class="diary-header">
                            <h3>我的日记 📝</h3>
                        </div>
                        <div class="diary-content">
                            <div class="diary-entry">
                                <div class="entry-date">今天</div>
                                <div class="entry-text">今天天气很好，心情也很棒！在SillyTavern里遇到了很多有趣的角色～</div>
                            </div>
                            <div class="diary-entry">
                                <div class="entry-date">昨天</div>
                                <div class="entry-text">学习了新的前端技术，感觉很有成就感。</div>
                            </div>
                        </div>
                    </div>
                `,
            },
            mail: {
                name: '邮件',
                content: `
                    <div class="mail-app">
                        <div class="mail-list">
                            <div class="mail-item unread">
                                <div class="mail-sender">SillyTavern</div>
                                <div class="mail-subject">欢迎使用手机界面</div>
                                <div class="mail-preview">这是一个可爱的手机界面框架...</div>
                                <div class="mail-time">1小时前</div>
                            </div>
                            <div class="mail-item">
                                <div class="mail-sender">系统通知</div>
                                <div class="mail-subject">插件更新提醒</div>
                                <div class="mail-preview">Mobile Context插件已更新...</div>
                                <div class="mail-time">2小时前</div>
                            </div>
                        </div>
                    </div>
                `,
            },
            shop: {
                name: '购物',
                content: null, // 将由shop-app动态生成
                isCustomApp: true,
                customHandler: this.handleShopApp.bind(this),
            },
            backpack: {
                name: '背包',
                content: null, // 将由backpack-app动态生成
                isCustomApp: true,
                customHandler: this.handleBackpackApp.bind(this),
            },
            task: {
                name: '任务',
                content: null, // 将由task-app动态生成
                isCustomApp: true,
                customHandler: this.handleTaskApp.bind(this),
            },
            live: {
                name: '直播',
                content: null, // 将由live-app动态生成
                isCustomApp: true,
                customHandler: this.handleLiveApp.bind(this),
            },
            'watch-live': {
                name: '观看直播',
                content: null, // 将由watch-live动态生成
                isCustomApp: true,
                customHandler: this.handleWatchLiveApp.bind(this),
            },
            'parallel-events': {
                name: '平行事件',
                content: null, // 将由parallel-events-app动态生成
                isCustomApp: true,
                customHandler: this.handleParallelEventsApp.bind(this),
            },
            'profile': {
                name: '档案',
                content: null, // 将由profile-app动态生成
                isCustomApp: true,
                customHandler: this.handleProfileApp.bind(this),
            },
            'delete-friends-circle': {
                name: '删朋友圈',
                isCustomApp: true,
                customHandler: this.handleDeleteFriendsCircle.bind(this),
            },
        };
    }

    // ... (rest of the file remains the same)

    // 绑定事件
    bindEvents() {
        // ... (existing event bindings)

        // 应用图标点击事件
        document.querySelectorAll(".app-icon").forEach(icon => {
            icon.addEventListener("click", e => {
                const appName = e.currentTarget.getAttribute("data-app");

                // 防抖：避免快速连续点击
                if (this._lastAppIconClick && Date.now() - this._lastAppIconClick < 300) {
                    console.log("[Mobile Phone] 防抖：应用图标点击过快，跳过:", appName);
                    return;
                }
                this._lastAppIconClick = Date.now();

                if (appName === 'delete-friends-circle') {
                    this.handleDeleteFriendsCircle();
                } else {
                    this.openApp(appName);
                }
            });
        });
    }
}
