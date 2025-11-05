/**
 * Message App - 未读消息管理模块
 * 为message-app.js提供未读消息统计和红点提示功能
 */

(function() {
    'use strict';

    class UnreadMessageManager {
        constructor() {
            // 未读消息统计 {friendId: count}
            this.unreadCounts = {};
            
            // 最后查看时间 {friendId: timestamp}
            this.lastViewTimes = {};
            
            // 加载本地存储的数据
            this.loadFromStorage();
            
            console.log('[UnreadMessageManager] 未读消息管理器已初始化');
        }

        /**
         * 从本地存储加载数据
         */
        loadFromStorage() {
            try {
                const stored = localStorage.getItem('messageApp_unreadCounts');
                if (stored) {
                    this.unreadCounts = JSON.parse(stored);
                }

                const viewTimes = localStorage.getItem('messageApp_lastViewTimes');
                if (viewTimes) {
                    this.lastViewTimes = JSON.parse(viewTimes);
                }

                console.log('[UnreadMessageManager] 已加载未读数据:', {
                    unreadCounts: Object.keys(this.unreadCounts).length,
                    lastViewTimes: Object.keys(this.lastViewTimes).length
                });
            } catch (error) {
                console.error('[UnreadMessageManager] 加载存储数据失败:', error);
            }
        }

        /**
         * 保存到本地存储
         */
        saveToStorage() {
            try {
                localStorage.setItem('messageApp_unreadCounts', JSON.stringify(this.unreadCounts));
                localStorage.setItem('messageApp_lastViewTimes', JSON.stringify(this.lastViewTimes));
            } catch (error) {
                console.error('[UnreadMessageManager] 保存存储数据失败:', error);
            }
        }

        /**
         * 增加未读消息数
         */
        incrementUnread(friendId) {
            if (!friendId) return;
            
            this.unreadCounts[friendId] = (this.unreadCounts[friendId] || 0) + 1;
            this.saveToStorage();
            
            console.log(`[UnreadMessageManager] 好友 ${friendId} 未读消息 +1, 当前: ${this.unreadCounts[friendId]}`);
            
            // 触发更新事件
            this.dispatchUpdateEvent();
        }

        /**
         * 清除未读消息数
         */
        clearUnread(friendId) {
            if (!friendId) return;
            
            const oldCount = this.unreadCounts[friendId] || 0;
            this.unreadCounts[friendId] = 0;
            this.lastViewTimes[friendId] = Date.now();
            this.saveToStorage();
            
            console.log(`[UnreadMessageManager] 清除好友 ${friendId} 的未读消息, 之前: ${oldCount}`);
            
            // 触发更新事件
            this.dispatchUpdateEvent();
        }

        /**
         * 获取未读消息数
         */
        getUnread(friendId) {
            return this.unreadCounts[friendId] || 0;
        }

        /**
         * 获取所有未读消息总数
         */
        getTotalUnread() {
            return Object.values(this.unreadCounts).reduce((sum, count) => sum + count, 0);
        }

        /**
         * 检查是否有未读消息
         */
        hasUnread(friendId) {
            return (this.unreadCounts[friendId] || 0) > 0;
        }

        /**
         * 设置未读消息数（用于批量设置）
         */
        setUnread(friendId, count) {
            if (!friendId) return;
            
            this.unreadCounts[friendId] = Math.max(0, count);
            this.saveToStorage();
            
            // 触发更新事件
            this.dispatchUpdateEvent();
        }

        /**
         * 触发更新事件
         */
        dispatchUpdateEvent() {
            const event = new CustomEvent('unreadMessagesUpdate', {
                detail: {
                    unreadCounts: {...this.unreadCounts},
                    totalUnread: this.getTotalUnread(),
                    timestamp: Date.now()
                }
            });
            window.dispatchEvent(event);
        }

        /**
         * 获取最后查看时间
         */
        getLastViewTime(friendId) {
            return this.lastViewTimes[friendId] || 0;
        }

        /**
         * 清空所有未读消息
         */
        clearAll() {
            this.unreadCounts = {};
            this.saveToStorage();
            this.dispatchUpdateEvent();
            console.log('[UnreadMessageManager] 已清空所有未读消息');
        }

        /**
         * 获取未读统计信息
         */
        getStats() {
            const friendsWithUnread = Object.keys(this.unreadCounts).filter(id => this.unreadCounts[id] > 0);
            return {
                totalUnread: this.getTotalUnread(),
                friendsWithUnread: friendsWithUnread.length,
                unreadCounts: {...this.unreadCounts}
            };
        }

        /**
         * 批量更新未读消息（用于从上下文检测新消息）
         */
        batchUpdateFromContext(friendMessagesMap) {
            let updated = false;

            for (const [friendId, messages] of Object.entries(friendMessagesMap)) {
                const lastViewTime = this.getLastViewTime(friendId);
                
                // 统计在最后查看时间之后的新消息
                const newMessages = messages.filter(msg => {
                    const msgTime = msg.timestamp || msg.send_date || 0;
                    return msgTime > lastViewTime;
                });

                if (newMessages.length > 0) {
                    this.unreadCounts[friendId] = newMessages.length;
                    updated = true;
                    console.log(`[UnreadMessageManager] 好友 ${friendId} 有 ${newMessages.length} 条新消息`);
                }
            }

            if (updated) {
                this.saveToStorage();
                this.dispatchUpdateEvent();
            }

            return updated;
        }
    }

    // 创建全局实例
    window.UnreadMessageManager = UnreadMessageManager;
    window.unreadMessageManager = new UnreadMessageManager();

    console.log('[UnreadMessageManager] 模块加载完成');

})();
