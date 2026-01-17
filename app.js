// 强制全局挂载，不等待任何加载
window.switchView = function(viewName) {
    console.log("!!! 强制切换激活 !!!", viewName);
    
    // 1. 映射 ID
    const idMap = {
        'square': 'square',
        'discovery': 'eat',
        'care': 'miss'
    };
    const targetId = idMap[viewName] || viewName;

    // 2. 暴力显示/隐藏 (使用 Style 覆盖一切)
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(s => {
        s.style.display = 'none';
    });

    const target = document.getElementById(targetId);
    if (target) {
        target.style.display = 'block';
        window.scrollTo(0, 0);
    }


    // 3. 强制解开滚动锁
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    // 4. 同步底部导航颜色 (简单粗暴版)
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.add('text-gray-400');
        nav.classList.remove('text-blue-500');
        if(nav.getAttribute('data-view') === viewName) {
            nav.classList.add('text-blue-500');
            nav.classList.remove('text-gray-400');
        }
    });
}

// --- 缘分匹配逻辑 ---

window.showRandomMatch = async function(excludeId) {
    const modal = document.getElementById('matchModal');
    const loading = document.getElementById('matchLoading');
    const content = document.getElementById('matchContent');
    
    if (!modal) return;
    
    // 1. 显示弹窗 & 重置状态
    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    content.classList.add('hidden');
    
    try {
        // 2. 模拟寻找过程 (至少等待 2 秒，制造仪式感)
        const delayPromise = new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. 随机获取数据 (获取最新的 50 条，然后前端随机挑一条，排除自己)
        const fetchPromise = supabaseClient
            .from('posts')
            .select('*')
            .neq('id', excludeId) // 排除刚才自己发的
            .order('created_at', { ascending: false })
            .limit(50);
            
        const [_, { data, error }] = await Promise.all([delayPromise, fetchPromise]);
        
        if (error) throw error;
        
        // 如果没有其他人的数据，就关闭弹窗，直接去广场
        if (!data || data.length === 0) {
            window.closeMatch();
            return;
        }

        // 4. 随机挑选一位
        const randomPost = data[Math.floor(Math.random() * data.length)];
        
        // 5. 渲染数据
        document.getElementById('matchImage').src = randomPost.image_url;
        document.getElementById('matchText').innerText = randomPost.content || "认真吃饭，也是一种修行";
        
        // 计算时间差
        const diff = Math.floor((new Date() - new Date(randomPost.created_at)) / 60000);
        const timeText = diff < 60 ? `${diff}分钟前` : `${Math.floor(diff/60)}小时前`;
        document.getElementById('matchTime').innerText = `TA 在 ${timeText}`;

        // 6. 切换显示
        loading.classList.add('hidden');
        content.classList.remove('hidden');
        
        // 重新初始化图标 (如果用了 Lucide)
        if(typeof lucide !== 'undefined') lucide.createIcons();

    } catch (e) {
        console.error("匹配失败", e);
        window.closeMatch(); // 出错就直接关闭
    }
};

window.closeMatch = function() {
    const modal = document.getElementById('matchModal');
    if (modal) modal.classList.add('hidden');
    // 关闭后，一定要记得刷新广场数据，让用户看到自己的新帖子
    window.switchView('square');
    window.fetchPosts('all');
};

window.toastCheers = function() {
    // 简单的"碰杯"反馈
    const btn = document.querySelector('#matchContent button:last-child');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = "✨ 已致意";
    btn.classList.add('bg-green-500', 'border-green-500');
    
    // 可以在这里加一个满屏飘 emoji 的动画，或者简单提示即可
    alert("🥂 你们云干杯了一次！");
    
    setTimeout(() => {
        window.closeMatch();
    }, 1000);
};

const maskId = (id) => {
    if (!id) return "神秘饭友";
    const parts = id.split('_');
    return parts.length >= 3 ? `饭友 ${parts[2].slice(0, 4)}...` : id.slice(-6);
};
// --- 1. 基础配置与全局变量 ---
function getUserId() {
    const STORAGE_KEY = 'have_you_eaten_uid';
    let userId = localStorage.getItem(STORAGE_KEY);
    if (!userId) {
        const randomPart = Math.random().toString(36).slice(2, 10);
        userId = `user_${Date.now()}_${randomPart}`;
        localStorage.setItem(STORAGE_KEY, userId);
    }
    return userId;
}
const MY_USER_ID = getUserId();

// 盲盒数据移到全局
const GLOBAL_FOOD_DATA = [ 
    "隆江猪脚饭", "沙县小吃", "兰州拉面", "黄焖鸡米饭", 
    "螺蛳粉", "麻辣烫", 
    "蛋炒饭", "扬州炒饭", "干炒牛河", "鲜切羊肉粉", 
    "青椒肉丝盖饭", "番茄炒蛋盖饭", "鱼香肉丝盖饭", "宫保鸡丁盖饭", 
    "麦当劳1+1", "塔斯汀汉堡", "华莱士", 
    "便利店饭团", "全家便当", 
    "煎饼果子", "手抓饼+烤肠", "鸡蛋灌饼", "烤冷面", 
    "凉皮肉夹馍", "重庆小面", "葱油拌面", "武汉热干面", 
    "鸭血粉丝汤", "酸辣粉", "过桥米线", "大盘鸡拌面", 
    "公司食堂", "饺子", "馄炖" 
];

// 修复盲盒逻辑 (放在 app.js 最外层)
window.openBlindBox = function() {
    console.log('点击生效：正在开启盲盒...');
    const foodResult = document.getElementById('blindBoxResult');
    const healthTip = document.getElementById('healthTip');
    
    if (!foodResult) {
        alert('错误：找不到盲盒显示区域 #blindBoxResult');
        return;
    }
    
    // 跑马灯逻辑
    const startTime = Date.now();
    const spinDuration = 1600;
    
    const tick = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= spinDuration) return;
        
        const randomPick = GLOBAL_FOOD_DATA[Math.floor(Math.random() * GLOBAL_FOOD_DATA.length)];
        foodResult.innerText = randomPick;
        
        const progress = elapsed / spinDuration;
        const nextDelay = 60 + Math.floor(progress * 140);
        setTimeout(tick, nextDelay);
    };
    
    foodResult.innerText = "挑选...";
    if(healthTip) healthTip.classList.add('opacity-0');
    tick();
    
    setTimeout(() => {
        const result = GLOBAL_FOOD_DATA[Math.floor(Math.random() * GLOBAL_FOOD_DATA.length)];
        foodResult.innerText = result;
        
        if (healthTip) {
            const tipText = result.includes("沙拉") ? "✨ 选了健康的一餐！" : "命运安排，吃它！😋";
            healthTip.innerText = tipText;
            healthTip.classList.remove('opacity-0');
        }
    }, spinDuration);
};

window.takePhoto = function() {
    console.log("正在拍照...");
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const modal = document.getElementById('publishModal');
    const preview = document.getElementById('publishPhotoPreview');
    const cameraView = document.getElementById('camera');

    if (!video || !canvas) return;

    // 1. 截图
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.7);

    // 2. 停止摄像头流
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
    }

    // 3. 界面切换：隐藏相机 -> 显示弹窗
    if (cameraView) cameraView.style.display = 'none';
    if (modal) modal.classList.remove('hidden');

    // 4. 将照片回填到弹窗的预览框中
    if (preview) {
        preview.innerHTML = `<img src="${imageData}" class="w-full h-full object-cover rounded-xl" style="pointer-events: none;">`;
    }
};

function loadFollowing() {
    try {
        const raw = localStorage.getItem(FOLLOWING_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveFollowing(list) {
    followingUids = [...new Set(list.filter(Boolean))];
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(followingUids));
}

function getMealType() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return "晨光早餐";
    if (hour >= 10 && hour < 14) return "忙碌午餐";
    if (hour >= 14 && hour < 17) return "悠哉午茶";
    if (hour >= 17 && hour < 21) return "治愈晚餐";
    return "深夜食堂";
}

const SUPABASE_URL = 'https://qzlljyrtxcxwzwqacvpy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BTWyerGQTZNktmx7wIROIg_wQGvFsxm';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 全局变量声明
let feedContainer;
let navItems;
let selectedMood = ""; 
let feedMode = 'all'; // 'all' | 'mine'
const FOLLOWING_KEY = 'following_uids';
let followingUids = [];

// --- 2. 核心功能函数 (挂载到 window 确保 HTML onclick 可用) ---

// 强制修复函数
window.switchView = function(viewName) {
    console.log('--- 切换系统启动 ---');
    console.log('收到指令:', viewName);
    
    // 1. 强制 ID 映射（解决 HTML 传参不对的问题）
    const idMap = {
        'square': 'square',
        'discovery': 'eat',
        'care': 'miss'
    };
    const targetId = idMap[viewName] || viewName;
    // 2. 隐藏所有 section
    document.querySelectorAll('.view-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    // 3. 显示目标容器
    const target = document.getElementById(targetId);
    if (target) {
        // 如果元素本来就是 flex 布局（比如 #start, #eat），必须恢复为 flex，否则居中会失效
        if (target.classList.contains('flex') || target.classList.contains('flex-col')) {
            target.style.display = 'flex';
        } else {
            target.style.display = 'block';
        }
        target.classList.add('active');
        console.log('已成功显示容器:', targetId);
    } else {
        alert('找不到容器: ' + targetId + '，请检查 HTML ID！');
    }
    // 4. 强制解开滚动锁
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    window.scrollTo(0, 0);
    
    // 如果切换到了牵挂页面，强制刷新一次数据
    if (viewName === 'care' || targetId === 'miss') {
        if (typeof fetchCareline === 'function') fetchCareline();
    }
    
    // 5. 工具栏同步 - 只有在square视图下显示礼物工具栏
    const toolbar = document.getElementById('giftToolbar');
    if (toolbar) {
        if (targetId === 'square') {
            toolbar.style.display = 'flex';
            // 延迟一小段时间设置透明度，以触发 transition 动画
            setTimeout(() => toolbar.style.opacity = '1', 10);
        } else {
            toolbar.style.opacity = '0';
            // 等待动画结束后隐藏，避免瞬间消失
            setTimeout(() => {
                if (toolbar.style.opacity === '0') toolbar.style.display = 'none';
            }, 300);
        }
    }
};
window.fetchPosts = async function(mode) {
    if (mode) feedMode = mode;
    const isMine = (feedMode === 'mine');
    
    const tabAll = document.getElementById('tabAll');
    const tabMine = document.getElementById('tabMine');
    const container = document.getElementById('feedContainer');
    const emptyState = document.getElementById('emptyState');
    const myEmptyState = document.getElementById('myEmptyState');

    if (!container) return;

    // 1. 切换 Tab UI
    if (tabAll && tabMine) {
        const active = "flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold shadow-sm transition-all active:scale-95";
        const inactive = "flex-1 py-3 rounded-2xl bg-orange-50 text-orange-500 font-bold border border-orange-100 transition-all active:scale-95";
        tabAll.className = !isMine ? active : inactive;
        tabMine.className = isMine ? active : inactive;
    }

    // 2. 显示加载状态
    container.innerHTML = `
<div class="flex flex-col items-center justify-center py-20 gap-3">
    <i data-lucide="map-pin" class="w-16 h-16 text-orange-500 animate-bounce"></i>
    <div class="text-orange-400 font-medium italic animate-pulse">正在翻看大家的饭桌故事...</div>
</div>
`;
    if (emptyState) emptyState.classList.add('hidden');
    if (myEmptyState) myEmptyState.classList.add('hidden');

    try {
        // 3. 数据库查询
        let query = supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
        if (isMine) query = query.eq('user_id', MY_USER_ID);

        const { data, error } = await query;
        if (error) throw error;

        container.innerHTML = '';

        // 4. 空状态处理
        if (!data || data.length === 0) {
            if (isMine && myEmptyState) myEmptyState.classList.remove('hidden');
            else if (!isMine && emptyState) emptyState.classList.remove('hidden');
            return;
        }

        // 5. 渲染卡片
        data.forEach((post, index) => {
            const cardHtml = `
                <div class="card p-6 mb-6 animate-fade-in mx-auto max-w-2xl bg-white rounded-2xl shadow-sm" style="animation-delay: ${index * 0.1}s; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                    <div class="post-photo-container relative rounded-xl overflow-hidden bg-[#FFF9F0] border border-gray-100 max-w-md mx-auto" data-post-id="${post.id}">
                        <img src="${post.image_url}" class="w-full h-auto object-cover" style="max-height: 400px;" loading="lazy">
                    </div>

                ${post.content ? `
                <div class="pt-3 px-1">
                    <p class="text-gray-600 text-sm leading-relaxed">
                        ${post.content}
                    </p>
                </div>
                ` : ''}
            </div>`;
            container.insertAdjacentHTML('beforeend', cardHtml);
        });

        // 6. 为所有照片容器绑定双击点赞事件
        const photoContainers = container.querySelectorAll('.post-photo-container');
        photoContainers.forEach((container, index) => {
            const post = data[index];
            
            // 1. 初始化状态
            container.setAttribute('data-post-id', post.id);
            container.setAttribute('data-like-count', post.likes_count || 0);
            container.setAttribute('data-has-liked', post.user_has_liked ? 'true' : 'false');

            // 2. 初始化亮度
            updatePhotoGlow(container, post.likes_count || 0);

            // 3. 绑定双击 (Desktop)
            container.addEventListener('dblclick', (e) => {
                e.preventDefault();
                handleDoubleTapLike(e, container, post.id);
            });

            // 4. 绑定双击 (Mobile - 模拟双击)
            let lastTap = 0;
            container.addEventListener('touchstart', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    e.preventDefault(); // 阻止默认放大
                    handleDoubleTapLike(e, container, post.id);
                }
                lastTap = currentTime;
            });
        });
        
        // 查询所有礼物数据
        const { data: giftsData, error: giftsError } = await supabaseClient
            .from('likes')
            .select('*')
            .eq('type', 'gift')
            .in('post_id', data.map(post => post.id));
            
        if (!giftsError && giftsData && giftsData.length > 0) {
            // 渲染历史礼物
            giftsData.forEach(gift => {
                const photoDiv = document.querySelector(`[data-post-id="${gift.post_id}"]`);
                if (photoDiv) {
                    // 关键：渲染到父级 card 上，而不是 photoDiv 内部
                    const cardContainer = photoDiv.closest('.card');
                    if (cardContainer) {
                        window.giftSystem.renderSticker(cardContainer, gift.gift_type, gift.pos_x, gift.pos_y);
                    }
                }
            });
        }
    } catch (err) {
        console.error('渲染错误:', err);
        container.innerHTML = '<div class="text-center py-10 text-red-400">哎呀，断网了... </div>';
    }
};

function formatTime(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = Math.floor((now - past) / 1000 / 60);
    if (diff < 1) return "刚刚";
    if (diff < 60) return `${diff}分钟前`;
    return past.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 相对时间 + 饭点语义化展示（牵挂线专用）
function formatRelativeTime(timestamp, mealType) {
    const now = new Date();
    const past = new Date(timestamp);

    // 归零为日期
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const pastDate = new Date(past.getFullYear(), past.getMonth(), past.getDate());
    const diffMs = today - pastDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // 饭点文案简化
    let mealLabel = mealType || "";
    if (mealLabel.includes("早餐")) mealLabel = "早餐";
    else if (mealLabel.includes("午餐")) mealLabel = "午餐";
    else if (mealLabel.includes("晚餐")) mealLabel = "晚餐";
    else if (mealLabel.includes("午茶")) mealLabel = "午茶";
    else if (mealLabel.includes("深夜")) mealLabel = "深夜食堂";

    if (diffDays === 0) {
        return mealLabel ? `今天${mealLabel}时分` : "今天";
    }
    if (diffDays === 1) {
        return mealLabel ? `昨天${mealLabel}` : "昨天";
    }
    return `${diffDays}天前`;
}

// --- 3. 页面初始化 ---

// 先定义一个标志，表示EmotionApertureSystem是否已初始化
let emotionAppInitialized = false;

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    followingUids = loadFollowing();

    // 强制设置默认页面为"记录页"
    window.switchView('start');

    // 首先获取基础元素
    feedContainer = document.getElementById('feedContainer');
    navItems = document.querySelectorAll('nav > div');

    // 立即调用loadPosts()，无需等待EmotionApertureSystem
    console.log('DOMContentLoaded - 立即调用loadPosts()');
    window.fetchPosts();
    
    // 恢复牵挂线数据
    fetchFollowingStatus();
    renderCareList();
    
    // 强制初始化工具栏状态
    const currentView = document.querySelector('.nav-item.text-blue-500')?.getAttribute('data-view') || 'square';
    // 如果当前是广场页，或者没有 active 的页面默认是广场页
    if (currentView === 'square') {
        const tb = document.getElementById('giftToolbar');
        if (tb) {
            tb.style.display = 'flex';
            setTimeout(() => tb.style.opacity = '1', 100);
        }
    }

    // 绑定心情标签
    document.querySelectorAll('.mood-tag').forEach(tag => {
        tag.onclick = () => {
            document.querySelectorAll('.mood-tag').forEach(t => {
                t.classList.replace('bg-orange-500', 'bg-white');
                t.classList.replace('text-white', 'text-gray-600');
            });
            tag.classList.replace('bg-white', 'bg-orange-500');
            tag.classList.replace('text-gray-600', 'text-white');
            selectedMood = tag.getAttribute('data-mood');
        };
    });

    // --- 找到这个位置开始替换 ---
    const nav = document.querySelector('nav');
    console.log('DOMContentLoaded - 导航元素:', nav);
    if (nav) {
        nav.addEventListener('click', (e) => {
            console.log('nav.click - 点击事件触发:', e.target);
            const navItem = e.target.closest('.nav-item');
            console.log('nav.click - 找到的navItem:', navItem);
            if (!navItem) return;
            
            let view = navItem.getAttribute('data-view');
            console.log('nav.click - data-view属性:', view);
            
            // 【核心整合】：如果点击“家人”，强制重定向到“牵挂线”
            if (view === 'family') {
                view = 'care'; 
            }

            console.log('nav.click - 调用window.switchView，view:', view);
            window.switchView(view);
            
            // 根据视图触发数据刷新
            if (view === 'square') {
                console.log('nav.click - 刷新广场数据，feedMode:', feedMode);
                window.fetchPosts(feedMode);
            } else if (view === 'care') {
                console.log('nav.click - 刷新牵挂线数据');
                fetchCareline(); // 刷新牵挂线数据
            }
        });
    }


    
    // 广场/我的瞬间切换
    const tabAll = document.getElementById('tabAll');
    const tabMine = document.getElementById('tabMine');
    if (tabAll) tabAll.onclick = () => window.fetchPosts('all');
    if (tabMine) tabMine.onclick = () => window.fetchPosts('mine');



    // --- 实时监听纸条 (更新版) ---
    // 1. 创建全局通知容器 (如果不存在)
    let globalToast = document.getElementById('globalNoteToast');
    if (!globalToast) {
        globalToast = document.createElement('div');
        globalToast.id = 'globalNoteToast';
        globalToast.className = 'global-note-toast';
        globalToast.innerHTML = `
            <div class="text-2xl">💌</div>
            <div>
                <p class="text-orange-600 font-bold text-sm">收到新纸条</p>
                <p class="text-gray-600 text-xs">有一位牵挂你的人，问你吃了么？</p>
            </div>
        `;
        document.body.appendChild(globalToast);
    }

    // 2. 开启监听
    const noteChannel = supabaseClient.channel('realtime_notes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'note_reminders'
            },
            (payload) => {
                // 只有当接收者是我，且发送者不是我(避免自己收到自己的通知)时触发
                if (payload.new.receiver_id === MY_USER_ID && payload.new.sender_id !== MY_USER_ID) {
                    // A. 播放提示音
                    playCuteSwoosh(); // 复用刚才定义的可爱音效
                    
                    // B. 震动手机
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

                    // C. 显示弹窗
                    const toast = document.getElementById('globalNoteToast');
                    toast.classList.add('show');
                    
                    // 4秒后自动收起
                    setTimeout(() => {
                        toast.classList.remove('show');
                    }, 4000);
                }
            }
        )
        .subscribe();



    // 拍照保存等原有逻辑...
    const video = document.getElementById('video');
    const shutter = document.getElementById('shutter');
    const canvas = document.getElementById('canvas');
    const photo = document.getElementById('photo');

    if (shutter) {
        // 已移除 shutter 事件绑定，改用 HTML onclick="window.takePhoto()"
    }

    const saveBtn = document.getElementById('save');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            if (!photo.src || photo.src.startsWith('data:image/gif')) {
                alert("请先拍摄照片");
                return;
            }
            if (!selectedMood) {
                if (!confirm("未选择心情标签，是否使用默认标签发布？")) return;
            }
            
            saveBtn.disabled = true;
            const originalText = saveBtn.innerText;
            saveBtn.innerText = "正在上传图片...";
            
            try {
                // 1. 压缩图片并转为 Blob 格式
                const imageBlob = await compressToBlob(photo.src, 1080, 0.7);
                
                // 2. 生成文件路径：public/${Date.now()}.jpg
                const filePath = `public/${Date.now()}.jpg`;
                
                // 3. 上传到 Supabase Storage
                const { error: uploadError } = await supabaseClient.storage
                    .from('post-images')
                    .upload(filePath, imageBlob, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });
                
                if (uploadError) {
                    throw new Error(`上传失败: ${uploadError.message}`);
                }
                
                // 4. 获取图片的公共 URL
                const { data: publicData } = supabaseClient.storage
                    .from('post-images')
                    .getPublicUrl(filePath);
                
                if (!publicData?.publicUrl) {
                    throw new Error("无法获取图片公共URL");
                }
                
                // 5. 将 URL 存入 posts 表的 image_url 字段
                const { data, error } = await supabaseClient.from('posts').insert([{ 
                    image_url: publicData.publicUrl, 
                    content: publishText.value.trim(),
                    user_id: MY_USER_ID,
                    created_at: new Date().toISOString()
                }]).select();
                
                if (error) throw error;
                
                const myNewId = data && data[0] ? data[0].id : null;
                
                // 重置心情选择
                selectedMood = "";
                document.querySelectorAll('.mood-tag').forEach(t => {
                    t.classList.replace('bg-orange-500', 'bg-white');
                    t.classList.replace('text-white', 'text-gray-600');
                });
                
                if (typeof showRandomMatch === 'function') {
                    showRandomMatch(myNewId);
                } else {
                    window.switchView('square');
                    window.fetchPosts();
                }
            } catch (err) {
                console.error('发布失败:', err);
                alert("发布失败: " + (err.message || "网络错误，请稍后重试"));
                saveBtn.disabled = false;
                saveBtn.innerText = originalText;
            }
        };
    }

    const retakeBtn = document.getElementById('retake');
    if (retakeBtn) retakeBtn.onclick = () => window.openPublishModal();

    // 牵挂线初始拉取 - 直接调用，确保数据预加载
    fetchCareline();
    
    // --- 修复：牵挂线页面交互逻辑 (整合版) --- 

    // 1. 绑定“我的牵挂码”弹窗 
    const showMyCodeBtn = document.getElementById('showMyCodeBtn'); 
    const codeModal = document.getElementById('codeModal'); 
    const closeCodeModal = document.getElementById('closeCodeModal'); 
    const codeValue = document.getElementById('codeValue'); 
    const copyCode = document.getElementById('copyCode'); 

    if (showMyCodeBtn && codeModal) { 
        showMyCodeBtn.onclick = () => { 
            if (codeValue) codeValue.innerText = MY_USER_ID; // 填入当前用户ID 
            codeModal.classList.remove('hidden'); 
        }; 
    } 
    
    // 关闭牵挂码弹窗 
    if (closeCodeModal && codeModal) { 
        closeCodeModal.onclick = () => codeModal.classList.add('hidden'); 
    } 

    // 复制功能 
    if (copyCode && codeValue) { 
        copyCode.onclick = async () => { 
            try { 
                await navigator.clipboard.writeText(codeValue.innerText); 
                const originalText = copyCode.innerText; 
                copyCode.innerText = "已复制"; 
                setTimeout(() => copyCode.innerText = originalText, 1500); 
            } catch (err) { 
                console.error('复制失败', err); 
                alert("复制失败，请手动复制: " + codeValue.innerText); 
            } 
        }; 
    } 

    // 2. 绑定“建立牵挂线”弹窗 
    const openFollowModalBtn = document.getElementById('openFollowModalBtn'); 
    const followModal = document.getElementById('followModal'); 
    const closeFollowModal = document.getElementById('closeFollowModal'); 
    const followInput = document.getElementById('followInput'); 
    const saveFollow = document.getElementById('saveFollow'); 

    if (openFollowModalBtn && followModal) { 
        openFollowModalBtn.onclick = () => { 
            // 清空输入框 
            if (followInput) followInput.value = ''; 
            followModal.classList.remove('hidden'); 
        }; 
    } 

    // 关闭绑定弹窗 
    if (closeFollowModal && followModal) { 
        closeFollowModal.onclick = () => followModal.classList.add('hidden'); 
    } 

    // 保存关注逻辑 
    if (saveFollow && followInput && followModal) { 
        saveFollow.onclick = () => { 
            const val = followInput.value.trim(); 
            
            // 简单校验 
            if (!val) { 
                alert("请输入牵挂码"); 
                return; 
            } 
            if (val === MY_USER_ID) { 
                alert("不能关注自己哦"); 
                return; 
            } 

            // 更新本地存储 
            const newList = [...followingUids, val]; 
            saveFollowing(newList); // 调用全局定义的保存函数 
            
            alert("关注成功！"); 
            
            // 关闭弹窗并刷新列表 
            followModal.classList.add('hidden'); 
            window.switchView('care'); // 确保在牵挂页 
            fetchCareline(); // 重新拉取数据 
        }; 
    }

    // 牵挂线初始拉取 - 无条件调用，确保数据预加载
    fetchCareline();
});

// --- 4. 互动与弹窗逻辑 ---

// --- 针对白色边框吸附优化的 GiftSystem --- 
class GiftSystem { 
    constructor() { 
        this.dragItem = null; 
        this.giftType = null; 
        this.init(); 
    } 

    init() { 
        document.querySelectorAll('.gift-icon').forEach(icon => { 
            icon.addEventListener('mousedown', (e) => this.startDrag(e, icon)); 
            icon.addEventListener('touchstart', (e) => this.startDrag(e, icon), { passive: false }); 
        }); 
    } 

    startDrag(e, sourceIcon) { 
        e.preventDefault(); 
        const point = e.touches ? e.touches[0] : e; 
        this.giftType = sourceIcon.getAttribute('data-gift'); 
        
        this.dragItem = document.createElement('img'); 
        this.dragItem.src = sourceIcon.querySelector('img').src; 
        this.dragItem.className = 'dragging-ghost'; 
        this.dragItem.style.pointerEvents = 'none'; 
        this.dragItem.style.position = 'fixed'; 
        this.dragItem.style.left = `${point.clientX - 25}px`; 
        this.dragItem.style.top = `${point.clientY - 25}px`; 
        this.dragItem.style.zIndex = '9999'; 
        document.body.appendChild(this.dragItem); 

        const moveHandler = (ev) => this.onMove(ev); 
        const endHandler = (ev) => { 
            this.onEnd(ev); 
            document.removeEventListener('mousemove', moveHandler); 
            document.removeEventListener('touchmove', moveHandler); 
            document.removeEventListener('mouseup', endHandler); 
            document.removeEventListener('touchend', endHandler); 
        }; 

        document.addEventListener('mousemove', moveHandler); 
        document.addEventListener('touchmove', moveHandler, { passive: false }); 
        document.addEventListener('mouseup', endHandler); 
        document.addEventListener('touchend', endHandler); 
    } 

    onMove(e) { 
        if (!this.dragItem) return; 
        e.preventDefault(); 
        const point = e.touches ? e.touches[0] : e; 
        this.dragItem.style.left = `${point.clientX - 25}px`; 
        this.dragItem.style.top = `${point.clientY - 25}px`; 
    } 

    async onEnd(e) { 
        if (!this.dragItem) return; 
        
        const point = e.changedTouches ? e.changedTouches[0] : e; 
        const clientX = point.clientX; 
        const clientY = point.clientY; 

        this.dragItem.remove(); 
        this.dragItem = null; 
        const toolbar = document.getElementById('giftToolbar'); 
        if(toolbar) toolbar.style.pointerEvents = 'none'; 
        
        const elementBelow = document.elementFromPoint(clientX, clientY); 
        
        if(toolbar) toolbar.style.pointerEvents = 'auto'; 

        // 目标改为外层的 .card 
        const card = elementBelow?.closest('.card'); 

        if (card) { 
            // ID 依然从内部容器获取 
            const innerContainer = card.querySelector('.post-photo-container'); 
            const postId = innerContainer ? innerContainer.getAttribute('data-post-id') : null; 

            if (!postId) return; 

            const rect = card.getBoundingClientRect(); 
            let perX = ((clientX - rect.left) / rect.width) * 100; 
            let perY = ((clientY - rect.top) / rect.height) * 100; 

            // 边缘吸附逻辑 
            const distLeft = perX; 
            const distRight = 100 - perX; 
            const distTop = perY; 
            const distBottom = 100 - perY; 
            const minDist = Math.min(distLeft, distRight, distTop, distBottom); 

            // 允许吸附范围放宽到 30% 
            if (minDist > 30) return; 

            if (minDist === distLeft) perX = 0; 
            else if (minDist === distRight) perX = 100; 
            else if (minDist === distTop) perY = 0; 
            else if (minDist === distBottom) perY = 100; 

            // 渲染在 card 上 
            this.renderSticker(card, this.giftType, perX, perY); 
            await this.saveToDB(postId, this.giftType, perX, perY); 
        } 
    } 

    renderSticker(container, type, x, y) { 
        const sticker = document.createElement('img'); 
        sticker.className = 'gift-sticker'; 
        sticker.src = `assets/${type}.png`; 
        sticker.style.position = 'absolute'; 
        sticker.style.left = `${x}%`; 
        sticker.style.top = `${y}%`; 
        
        const rotate = (Math.random() - 0.5) * 40; 
        sticker.style.transform = `translate(-50%, -50%) rotate(${rotate}deg)`; 
        
        sticker.style.width = '50px'; 
        sticker.style.height = '50px'; 
        sticker.style.zIndex = '100'; 
        container.appendChild(sticker); 
    } 
    
    async saveToDB(postId, type, x, y) { 
        console.log(`正在尝试保存礼物: PostID=${postId}, Type=${type}, X=${x}, Y=${y}`); 
        
        // 1. 发送请求并获取 error 对象 
        const { data, error } = await supabaseClient.from('likes').insert({ 
            post_id: postId, 
            user_id: MY_USER_ID, 
            type: 'gift', 
            gift_type: type, 
            pos_x: x, 
            pos_y: y 
        }).select(); 

        // 2. 错误处理与调试 
        if (error) { 
            console.error('❌ 数据库写入失败:', error); 
            // 关键：弹出错误提示，让用户直接看到原因 
            alert(`礼物保存失败！\n错误代码: ${error.code}\n原因: ${error.message}\n(请截图发给开发者)`); 
        } else { 
            console.log('✅ 数据库写入成功:', data); 
        } 
    } 
}

// 初始化礼物投喂系统
const giftSystem = new GiftSystem();
// 将系统挂载到window对象上，以便全局调用
window.giftSystem = giftSystem;
// 设置初始化完成标志
emotionAppInitialized = true;
console.log('GiftSystem初始化完成，emotionAppInitialized =', emotionAppInitialized);



async function showRandomMatch(excludeId) {
    const modal = document.getElementById('matchModal');
    const loading = document.getElementById('matchLoading');
    const content = document.getElementById('matchContent');
    
    if (!modal || !loading || !content) {
        window.switchView('square');
        window.fetchPosts();
        return;
    }
    
    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    content.classList.add('hidden');
    
    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .neq('id', excludeId)
            .limit(30);
        
        // 至少显示1.5秒的加载动画
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            window.closeMatch();
            return;
        }
        
        const randomPost = data[Math.floor(Math.random() * data.length)];
        const matchImage = document.getElementById('matchImage');
        const matchMood = document.getElementById('matchMood');
        const matchLocation = document.getElementById('matchLocation');
        
        if (matchImage) matchImage.src = randomPost.image_url;
        if (matchMood) matchMood.innerText = randomPost.content || "认真吃饭";
        if (matchLocation) matchLocation.innerText = `— 记录于 ${randomPost.location || '烟火世界'}`;
        
        loading.classList.add('hidden');
        content.classList.remove('hidden');
    } catch (err) {
        console.error('匹配失败:', err);
        window.closeMatch();
    }
}
window.closeMatch = () => {
    const modal = document.getElementById('matchModal');
    const loading = document.getElementById('matchLoading');
    const content = document.getElementById('matchContent');
    
    if (modal) modal.classList.add('hidden');
    if (loading) loading.classList.remove('hidden');
    if (content) content.classList.add('hidden');
    
    window.switchView('square');
    window.fetchPosts();
};

// 图片压缩为 Blob（JPEG）并限制宽度
async function compressToBlob(dataUrl, maxWidth = 1080, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxWidth / img.width);
            const targetWidth = Math.round(img.width * scale);
            const targetHeight = Math.round(img.height * scale);
            
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('图片压缩失败'));
            }, 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error('图片加载失败，无法压缩'));
        img.src = dataUrl;
    });
}
async function fetchCareline() {
    const careList = document.getElementById('careList');
    const careEmpty = document.getElementById('careEmpty');
    if (!careList) return;

    // 仅在列表为空时显示骨架屏，避免刷新时的闪烁
    if (careList.innerHTML.trim() === '') {
        careList.innerHTML = '<div class="skeleton w-full h-32 rounded-2xl mb-4"></div>';
    }

    try {
        // 1. 获取关注关系 (强制去重逻辑)
        const { data: relations, error: relationError } = await supabaseClient
            .from('relationships')
            .select('following_id')
            .eq('follower_id', MY_USER_ID);

        if (relationError) throw relationError;

        // 【关键修复】使用 Set 进行去重，防止出现两个相同的人
        const uniqueFollowingUids = [...new Set((relations || []).map(r => r.following_id))];

        // 2. 如果没有关注任何人
        if (uniqueFollowingUids.length === 0) {
            careList.innerHTML = '';
            if (careEmpty) careEmpty.classList.remove('hidden');
            return;
        }

        if (careEmpty) careEmpty.classList.add('hidden');

        // 3. 批量获取这些人的最新帖子
        const { data: posts, error: postError } = await supabaseClient
            .from('posts')
            .select('*')
            .in('user_id', followingUids)
            .order('created_at', { ascending: false });

        if (postError) throw postError;

        // 4. 渲染列表
        careList.innerHTML = ''; // 清空骨架屏

        uniqueFollowingUids.forEach(uid => {
            // 找到该用户最新的帖子
            const userPosts = (posts || []).filter(p => p.user_id === uid);
            const latest = userPosts[0];

            let cardHtml = '';
            
            if (!latest) {
                // 状态 A：从未打卡
                cardHtml = `
                    <div class="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm border-care-soft animate-care-pulse mb-3">
                        <div class="flex items-center justify-between mb-2">
                            <div class="text-[10px] text-gray-400">牵挂码：${String(uid).slice(-8)}</div>
                            <span class="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-full">暂无动态</span>
                        </div>
                        <p class="text-gray-700 text-sm mb-3">TA 好像还没开始记录吃饭...</p>
                        <button 
                            class="w-full py-2 bg-orange-100 text-orange-600 rounded-xl text-xs font-bold btn-q弹" 
                            onclick="event.stopPropagation(); window.sendNoteToUser('${uid}', this)" 
                        > 
                            递纸条问候 
                        </button>
                    </div>`;
            } else {
                // 状态 B：有记录
                const lastTimeText = typeof formatRelativeTime === 'function'
                    ? formatRelativeTime(latest.created_at, latest.location || '') // 兼容旧逻辑
                    : '最近';
                
                cardHtml = `
                    <div class="border-2 border-green-100 bg-white rounded-2xl p-4 flex flex-col gap-3 mb-3">
                        <div class="flex gap-3">
                            <div class="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                                <img src="${latest.image_url}" class="w-full h-full object-cover">
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="text-[10px] text-gray-400 truncate">牵挂码：${String(uid).slice(-8)}</div>
                                    <span class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">已打卡</span>
                                </div>
                                <p class="text-gray-900 font-bold mt-1 text-sm truncate">${latest.content || '好好吃饭'}</p>
                                <p class="text-[11px] text-gray-500 mt-1">${lastTimeText}</p>
                            </div>
                        </div>
                        <button 
                            class="w-full py-2 bg-orange-100 text-orange-600 rounded-xl text-xs font-bold btn-q弹" 
                            onclick="event.stopPropagation(); window.sendNoteToUser('${uid}', this)" 
                        > 
                            递纸条问候 
                        </button>
                    </div>`;
            }
            
            careList.insertAdjacentHTML('beforeend', cardHtml);
        });
        
    } catch (err) {
        console.error('加载牵挂线失败:', err);
        // 如果出错且列表为空，才显示错误提示，否则保留旧数据
        if (careList.innerHTML.includes('skeleton')) {
            careList.innerHTML = '<p class="text-center text-red-400 text-sm py-4">网络开小差了，下拉刷新试试</p>';
        }
    }
}

// --- 递纸条系统重构 (包含音频与物理动画) --- 

// 1. 合成音效 (无需外部文件，直接生成可爱的"啾"声) 
function playCuteSwoosh() { 
    try { 
        const AudioContext = window.AudioContext || window.webkitAudioContext; 
        if (!AudioContext) return; 
        const ctx = new AudioContext(); 
        const osc = ctx.createOscillator(); 
        const gain = ctx.createGain(); 
        
        osc.type = 'sine'; 
        // 频率从 400Hz 滑向 800Hz (升调更可爱) 
        osc.frequency.setValueAtTime(400, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1); 
        
        // 音量渐隐 
        gain.gain.setValueAtTime(0.3, ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3); 
        
        osc.connect(gain); 
        gain.connect(ctx.destination); 
        osc.start(); 
        osc.stop(ctx.currentTime + 0.3); 
    } catch (e) { console.log('Audio disabled'); } 
} 

// --- 递纸条核心逻辑 (强制全局挂载) ---
window.sendNoteToUser = async function(receiverId, btnElement) { 
    console.log("👆 点击触发：准备发送纸条给", receiverId); 
    
    if (!receiverId || !btnElement) { 
        console.error("❌ 缺少参数：", receiverId, btnElement); 
        return; 
    } 
    
    // 0. 按钮防抖 (防止狂点) 
    if (btnElement.disabled) return; 
    btnElement.disabled = true; 
    
    // A. 播放音效 
    if (typeof playCuteSwoosh === 'function') playCuteSwoosh(); 

    // B. 创建手绘纸条 DOM 
    const paper = document.createElement('div'); 
    paper.className = 'note-paper-visual'; 
    paper.innerText = "吃了么？"; 
    document.body.appendChild(paper); 

    // C. 计算飞行起点 
    const startRect = btnElement.getBoundingClientRect(); 
    const startX = startRect.left + startRect.width / 2; 
    const startY = startRect.top; 

    // D. 计算飞行终点 
    const card = btnElement.closest('.border-2') || btnElement.closest('.bg-white'); 
    let targetImg = card ? card.querySelector('img') : null; 
    let endX, endY; 

    if (targetImg) { 
        const endRect = targetImg.getBoundingClientRect(); 
        endX = endRect.left + endRect.width / 2; 
        endY = endRect.top + endRect.height / 2; 
    } else { 
        const cardRect = card.getBoundingClientRect(); 
        endX = cardRect.left + cardRect.width / 2; 
        endY = cardRect.top + cardRect.height / 2; 
    } 

    // E. 执行动画 
    const startTime = performance.now(); 
    const duration = 800; 
    let lastHeartTime = 0; 

    function animate(time) { 
        const elapsed = time - startTime; 
        const progress = Math.min(elapsed / duration, 1); 
        const ease = 1 - Math.pow(1 - progress, 3); 

        const currentX = startX + (endX - startX) * ease; 
        const currentY = startY + (endY - startY) * ease; 

        const flutter = Math.sin(progress * 10) * 10; 
        const rotate = Math.sin(progress * 15) * 15; 

        paper.style.left = `${currentX - 50}px`; 
        paper.style.top = `${currentY - 35 + flutter}px`; 
        paper.style.transform = `rotate(${rotate}deg) scale(${1 - progress * 0.5})`; 

        if (elapsed - lastHeartTime > 50) { 
            if (typeof createHeartTrail === 'function') createHeartTrail(currentX, currentY); 
            lastHeartTime = elapsed; 
        } 

        if (progress < 1) { 
            requestAnimationFrame(animate); 
        } else { 
            paper.remove(); 
            if(targetImg) { 
                targetImg.style.transition = 'transform 0.2s'; 
                targetImg.style.transform = 'scale(0.8)'; 
                setTimeout(() => targetImg.style.transform = 'scale(1)', 200); 
                
                // 显示气泡 
                const bubble = document.createElement('div'); 
                bubble.className = 'note-bubble-landed'; 
                bubble.innerHTML = '❤️'; 
                targetImg.parentNode.appendChild(bubble); 
                setTimeout(() => bubble.remove(), 2000); 
            } 
            // 动画结束，恢复按钮 
            btnElement.disabled = false; 
        } 
    } 
    requestAnimationFrame(animate); 

    // F. 数据库写入 (并行处理) 
    try { 
        const { error } = await supabaseClient 
            .from('note_reminders') 
            .insert({ 
                sender_id: MY_USER_ID, 
                receiver_id: receiverId, 
                is_read: false 
            }); 
        
        if (error) { 
            console.error('❌ 数据库写入错误:', error); 
            alert('发送失败：' + error.message); 
        } else { 
            console.log('✅ 纸条已存入数据库'); 
        } 
    } catch (err) { 
        console.error('❌ 系统错误:', err); 
    } 
}; 

// 辅助：创建爱心粒子 
function createHeartTrail(x, y) { 
    const heart = document.createElement('div'); 
    heart.innerText = '💗'; 
    heart.className = 'heart-trail'; 
    heart.style.left = `${x}px`; 
    heart.style.top = `${y}px`; 
    document.body.appendChild(heart); 
    setTimeout(() => heart.remove(), 800); 
} 

// 3. 数据库写入 
async function insertNoteIntoDatabase(receiverId) { 
    try { 
        const { error } = await supabaseClient 
            .from('note_reminders') 
            .insert({ 
                sender_id: MY_USER_ID, 
                receiver_id: receiverId, 
                is_read: false 
            }); 
        if (error) throw error; 
        console.log('✅ 纸条已送达数据库'); 
    } catch (err) { 
        console.error('❌ 纸条发送失败:', err); 
    } 
}

// --- 发布弹窗功能 --- 
// 发布弹窗相关元素
let publishModal, publishModalContent, closePublishModal, publishPhotoPreview, publishText, publishBtn;

// 强制挂载到 window，确保 HTML onclick 能访问
window.openPublishModal = function() {
    console.log('点击生效：正在打开发布弹窗...');
    // 直接获取 DOM，不依赖全局变量
    const modal = document.getElementById('publishModal');
    const content = modal ? modal.querySelector('div') : null;
    
    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            content.style.transform = 'translateY(0)';
        }, 10);
        
        // 聚焦输入框
        const textInput = document.getElementById('publishText');
        if(textInput) textInput.focus();
    } else {
        alert('错误：找不到 #publishModal 元素');
    }
};

// 关闭发布弹窗
function closePublishModalFunc() {
    if (publishModal && publishModalContent) {
        publishModalContent.style.transform = 'translateY(100%)';
        publishModalContent.style.transitionTimingFunction = 'ease-in';
        // 等待动画结束后隐藏弹窗
        setTimeout(() => {
            publishModal.classList.add('hidden');
        }, 500);
        // 重置表单
        publishPhotoPreview.innerHTML = '<i data-lucide="camera" class="w-16 h-16 text-orange-400"></i>';
        // 使用全局 createIcons 函数，而不是 lucide.createIcons
        if (typeof createIcons !== 'undefined') {
            createIcons();
        }
        publishText.value = '';
        updateCharCount();
    }
}

// 更新文字输入字数统计
function updateCharCount() {
    const charCount = publishText ? publishText.value.length : 0;
    const charCountElement = publishText ? publishText.nextElementSibling : null;
    if (charCountElement) {
        charCountElement.textContent = `${charCount}/200`;
    }
}

// 处理发布弹窗中照片预览区域的点击事件
window.handlePublishPhotoPreviewClick = async function() {
    console.log("启动摄像头流程...");
    const modal = document.getElementById('publishModal');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        }); 

        const video = document.getElementById('video'); 
        if (video) { 
            video.srcObject = stream; 
            // 1. 暂时隐藏发布弹窗 
            if (modal) modal.classList.add('hidden'); 
            // 2. 显示相机视图 
            const cameraView = document.getElementById('camera'); 
            if (cameraView) cameraView.style.display = 'flex'; 
        } 
    } catch (e) { 
        alert("无法启动相机，请检查权限"); 
        console.error(e); 
    } 
};



// 发布内容到Supabase
async function publishContent() {
    if (!publishText) return;
    
    const text = publishText.value.trim();
    const photoElement = publishPhotoPreview.querySelector('img');
    const imageUrl = photoElement ? photoElement.src : null;
    
    // 简单验证
    if (!imageUrl) {
        alert('请先上传照片');
        return;
    }
    
    try {
        // 保存到Supabase
        const { data, error } = await supabaseClient
            .from('posts')
            .insert({
                image_url: imageUrl,
                content: text,
                user_id: MY_USER_ID,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            throw error;
        }
        
        // 获取新发布的帖子ID（用于排除自己）
        const myNewPostId = data && data[0] ? data[0].id : null;
        
        // 1. 关闭发布弹窗
        closePublishModalFunc();
        
        // 2. 核心修改：不再直接刷新列表，而是展示匹配
        window.showRandomMatch(myNewPostId);
    } catch (error) {
        console.error('发布失败:', error);
        // 显示更详细的错误信息，帮助诊断问题
        const errorMsg = error.message || JSON.stringify(error);
        alert(`发布失败: ${errorMsg}\n\n请检查控制台获取更多详细信息`);
    }
}

// 预加载机制：确保纸条和动画资源提前加载
function preloadNoteResources() {
    // 1. 预创建纸条元素，确保CSS已经加载
    const preloadNote = document.createElement('div');
    preloadNote.className = 'note-paper';
    preloadNote.innerText = '吃了么？';
    preloadNote.style.opacity = '0';
    preloadNote.style.pointerEvents = 'none';
    preloadNote.style.zIndex = '-1';
    document.body.appendChild(preloadNote);
    
    // 2. 预创建爱心粒子元素
    const preloadHeart = document.createElement('div');
    preloadHeart.className = 'heart-particle';
    preloadHeart.style.opacity = '0';
    preloadHeart.style.pointerEvents = 'none';
    preloadHeart.style.zIndex = '-1';
    document.body.appendChild(preloadHeart);
    
    // 3. 预创建碎屑元素
    const preloadCrumb = document.createElement('div');
    preloadCrumb.className = 'crumb';
    preloadCrumb.style.opacity = '0';
    preloadCrumb.style.pointerEvents = 'none';
    preloadCrumb.style.zIndex = '-1';
    document.body.appendChild(preloadCrumb);
    
    // 4. 预创建未读气泡元素
    const preloadBubble = document.createElement('div');
    preloadBubble.className = 'unread-bubble';
    preloadBubble.style.opacity = '0';
    preloadBubble.style.pointerEvents = 'none';
    preloadBubble.style.zIndex = '-1';
    document.body.appendChild(preloadBubble);
    
    // 5. 短暂延迟后移除预加载元素
    setTimeout(() => {
        preloadNote.remove();
        preloadHeart.remove();
        preloadCrumb.remove();
        preloadBubble.remove();
    }, 100);
    

}

// 发布弹窗事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 预加载纸条相关资源
    preloadNoteResources();
    
    // 初始化发布弹窗相关元素
    publishModal = document.getElementById('publishModal');
    publishModalContent = publishModal ? publishModal.querySelector('div') : null;
    closePublishModal = document.getElementById('closePublishModal');
    publishPhotoPreview = document.getElementById('publishPhotoPreview');
    publishText = document.getElementById('publishText');
    publishBtn = document.getElementById('publishBtn');
    
    // 关闭发布弹窗
    if (closePublishModal) {
        closePublishModal.addEventListener('click', closePublishModalFunc);
    }

    // 点击照片预览区域调用摄像头 - 已经在HTML中使用onclick直接绑定

    // 文字输入字数统计
    if (publishText) {
        publishText.addEventListener('input', updateCharCount);
    }

    // 发布按钮点击事件
    if (publishBtn) {
        publishBtn.addEventListener('click', publishContent);
    }
});

// --- 双击光晕点赞系统 ---

// 1. 计算光芒强度的算法 (1-20人线性增强)
function updatePhotoGlow(container, likeCount) {
    // 限制最大计算阈值为 20
    const intensity = Math.min(likeCount, 20);
    const ratio = intensity / 20; // 0.0 到 1.0

    // 计算透明度：起步 0.2，最高 0.8
    const opacity = 0.2 + (ratio * 0.6);
    
    // 计算阴影扩散半径：起步 5px，最高 30px
    const spread = 5 + (ratio * 25);

    // 应用 CSS 变量和样式
    container.style.setProperty('--glow-opacity', opacity);
    container.style.boxShadow = `0 4px ${spread}px rgba(255, 150, 50, ${opacity})`;
    container.style.transition = 'all 0.5s ease';
    
    // 只有当有人点赞时才开启呼吸动画
    if (likeCount > 0) {
        container.style.borderColor = 'rgba(255, 165, 0, 0.5)';
        // 动态设置动画：人越多呼吸越急促 (3秒 -> 1秒)
        container.style.animation = `warm-breathe ${3 - (ratio * 2)}s infinite ease-in-out`;
    }
}

// 2. 核心：处理双击逻辑
async function handleDoubleTapLike(event, container, postId) {
    // A. 视觉：立即触发光晕 (乐观更新，不管数据库是否成功)
    const rect = container.getBoundingClientRect();
    
    // 兼容鼠标和触摸事件的坐标获取
    const clientX = event.clientX || (event.changedTouches && event.changedTouches[0].clientX);
    const clientY = event.clientY || (event.changedTouches && event.changedTouches[0].clientY);
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const halo = document.createElement('div');
    halo.className = 'orange-halo';
    halo.style.left = `${x}px`;
    halo.style.top = `${y}px`;
    container.appendChild(halo);

    // 动画结束后移除 DOM 节点
    setTimeout(() => halo.remove(), 600);

    // B. 数据：检查是否已点赞
    const hasLiked = container.getAttribute('data-has-liked') === 'true';
    
    if (!hasLiked) {
        // 标记为已点赞，防止重复计入数据库
        container.setAttribute('data-has-liked', 'true');
        
        // 乐观更新 UI：立即增加计数和亮度
        let currentCount = parseInt(container.getAttribute('data-like-count') || '0');
        currentCount++;
        container.setAttribute('data-like-count', currentCount);
        updatePhotoGlow(container, currentCount);

        try {
            // C. 数据库：写入 likes 表
            const { error } = await supabaseClient
                .from('likes')
                .insert({
                    post_id: postId,
                    user_id: MY_USER_ID,
                    type: 'orange' // 统一标记为暖橙光
                });

            if (error) throw error;
            console.log('点赞成功写入数据库');
        } catch (err) {
            console.error('点赞失败:', err);
            // 这里我们选择不回滚 UI，保持乐观体验
        }
    } else {
        console.log('用户已点赞，仅触发光晕特效');
    }
}

// --- 🛡️ FAIL-SAFE: Care Line Interaction Logic (Isolated) ---
// This function is separated to prevent being blocked by other errors.

window.setupCareInteractions = function() {
    console.log(">>> Force-initializing Care Line interactions...");

    // 1. My Care Code Modal
    const showBtn = document.getElementById('showMyCodeBtn');
    const codeModal = document.getElementById('codeModal');
    const closeCodeBtn = document.getElementById('closeCodeModal');
    const codeValue = document.getElementById('codeValue');
    const copyBtn = document.getElementById('copyCode');

    if (showBtn) {
        // Remove old listeners just in case
        const newBtn = showBtn.cloneNode(true);
        showBtn.parentNode.replaceChild(newBtn, showBtn);
        
        newBtn.onclick = function(e) {
            e.preventDefault();
            console.log("Clicked: My Code");
            if (codeValue) codeValue.innerText = typeof MY_USER_ID !== 'undefined' ? MY_USER_ID : 'user_unknown';
            if (codeModal) codeModal.classList.remove('hidden');
        };
    } else {
        console.warn("Element not found: showMyCodeBtn");
    }

    if (closeCodeBtn && codeModal) {
        closeCodeBtn.onclick = () => codeModal.classList.add('hidden');
    }

    if (copyBtn && codeValue) {
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(codeValue.innerText);
                const originalText = copyBtn.innerText;
                copyBtn.innerText = "已复制";
                setTimeout(() => copyBtn.innerText = originalText, 1500);
            } catch (err) {
                alert("Please copy manually: " + codeValue.innerText);
            }
        };
    }

    // 2. Follow/Bind Modal
    const followBtn = document.getElementById('openFollowModalBtn');
    const followModal = document.getElementById('followModal');
    const closeFollowBtn = document.getElementById('closeFollowModal');
    const saveFollowBtn = document.getElementById('saveFollow');
    const followInput = document.getElementById('followInput');

    if (followBtn) {
        // Remove old listeners
        const newFollowBtn = followBtn.cloneNode(true);
        followBtn.parentNode.replaceChild(newFollowBtn, followBtn);

        newFollowBtn.onclick = function(e) {
            e.preventDefault();
            console.log("Clicked: Establish Care Line");
            if (followInput) followInput.value = '';
            if (followModal) followModal.classList.remove('hidden');
        };
    } else {
        console.warn("Element not found: openFollowModalBtn");
    }

    if (closeFollowBtn && followModal) {
        closeFollowBtn.onclick = () => followModal.classList.add('hidden');
    }

    if (saveFollowBtn && followInput && followModal) {
        saveFollowBtn.onclick = async function() {
            const val = followInput.value.trim();
            if (!val) return alert("请输入牵挂码");
            if (typeof MY_USER_ID !== 'undefined' && val === MY_USER_ID) return alert("不能关注自己哦");

            const originalText = saveFollowBtn.innerText;
            saveFollowBtn.innerText = "保存中...";
            saveFollowBtn.disabled = true;

            try {
                // 【核心修复】先检查是否已经关注了，防止重复数据
                const { data: existing } = await supabaseClient
                    .from('relationships')
                    .select('id')
                    .eq('follower_id', MY_USER_ID)
                    .eq('following_id', val);

                if (existing && existing.length > 0) {
                    alert("你已经关注过 TA 啦，不用重复添加~");
                    followModal.classList.add('hidden');
                    if (typeof fetchCareline === 'function') fetchCareline();
                    return; // 退出，不执行插入
                }

                // 执行插入
                const { error } = await supabaseClient
                    .from('relationships')
                    .insert({
                        follower_id: MY_USER_ID,
                        following_id: val
                    });

                if (error) throw error;
                
                alert("牵挂成功！");
                followModal.classList.add('hidden');
                
                // 立即刷新列表
                if (typeof window.switchView === 'function') window.switchView('care');
                if (typeof fetchCareline === 'function') fetchCareline();
            } catch (err) {
                console.error(err);
                alert("关注失败: " + (err.message || "网络问题"));
            } finally {
                saveFollowBtn.innerText = originalText;
                saveFollowBtn.disabled = false;
            }
        };
    }
};

// --- EXECUTION TRIGGERS ---

// 1. Run on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.setupCareInteractions, 500); // Small delay to ensure DOM is ready
});

// 2. Run immediately in case DOM is already loaded (for hot reload)
window.setupCareInteractions();

// 3. Re-bind when switching views (Mutation Observer alternative)
const careSection = document.getElementById('miss');
if (careSection) {
    careSection.addEventListener('click', (e) => {
        // If the user clicks anywhere in the care section, re-check bindings
        // This is a "lazy" fix for dynamic button rendering
        if (e.target.id === 'showMyCodeBtn' || e.target.id === 'openFollowModalBtn') {
             window.setupCareInteractions();
        }
    });
}
