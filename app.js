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

// --- 修改后的完整 switchView 函数 ---
window.switchView = function(viewName) {
    const allViews = {
        start: document.getElementById('startView'),
        camera: document.getElementById('cameraView'),
        preview: document.getElementById('photoPreview'),
        square: document.getElementById('squareView'),
        // 删掉了 family
        discovery: document.getElementById('discoveryView'),
        care: document.getElementById('careView'),
        match: document.getElementById('matchModal')
    };

    Object.values(allViews).forEach(v => { if (v) v.classList.add('hidden'); });
    if (allViews[viewName]) allViews[viewName].classList.remove('hidden');

    // 标题现在作为视图的一部分，会随着视图的显示而显示，隐藏而隐藏
    // 因此移除了原来的标题显示控制逻辑

    const nav = document.querySelector('nav');
    if (nav) {
        if (viewName === 'camera' || viewName === 'preview') nav.classList.add('hidden');
        else nav.classList.remove('hidden');
    }
    
    const navItems = document.querySelectorAll('nav .nav-item');
    navItems.forEach((item) => {
        const viewAttr = item.getAttribute('data-view');
        const isActive = (viewName === viewAttr);
        item.classList.toggle('active', isActive);
        item.classList.toggle('text-orange-500', isActive);
        item.classList.toggle('font-bold', isActive);
        item.classList.toggle('text-gray-400', !isActive);
    });
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
        if (isMine) query = query.eq('author_id', MY_USER_ID);

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
            const hasCheered = localStorage.getItem(`cheers_${post.id}`);
            const hasComforted = localStorage.getItem(`comfort_${post.id}`);
            
            const cardHtml = `
                <div class="card p-6 mb-6 animate-fade-in mx-auto max-w-2xl" style="animation-delay: ${index * 0.1}s">
                    <div class="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-orange-50/98 to-yellow-50/98 aspect-square border border-orange-100/60 max-w-md mx-auto">
                        <div class="absolute inset-0 bg-[#FFF8F0] opacity-80"></div>
                        <img src="${post.image_url}" class="w-full h-full object-contain mx-auto relative z-10 p-4" style="max-height: calc(100% - 2rem);" loading="lazy">
                        
                        <div class="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-white/80 z-20">
                            <span class="text-[10px] font-bold text-orange-600 flex items-center gap-1">
                                <i data-lucide="map-pin" class="w-3 h-3"></i> ${post.location || '美味瞬间'}
                            </span>
                        </div>
                    </div>

                    <div class="pt-4 px-1">
                        <p class="text-gray-700 text-sm font-medium leading-relaxed mb-3">
                            ${post.content || '认真吃饭，保持热爱。'}
                        </p>
                        
                        <div class="flex items-center justify-between">
                            <div class="flex gap-2">
                                <button onclick="handleInteraction('${post.id}', 'cheers', this)" 
                                        class="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100 transition-all btn-q弹 ${hasCheered ? 'opacity-50 grayscale pointer-events-none' : ''}">
                                    <i data-lucide="beer" class="w-4 h-4"></i>
                                    <span class="font-bold text-orange-600 text-[11px]">${post.cheers || 0}</span>
                                </button>
                                <button onclick="handleInteraction('${post.id}', 'comfort', this)" 
                                        class="flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 transition-all btn-q弹 ${hasComforted ? 'opacity-50 grayscale pointer-events-none' : ''}">
                                    <i data-lucide="hand" class="w-4 h-4"></i>
                                    <span class="font-bold text-blue-600 text-[11px]">${post.comfort || 0}</span>
                                </button>
                            </div>

                            <div class="text-right">
                                <p class="text-[9px] text-gray-400 font-light italic">
                                    ${formatTime(post.created_at)}
                                </p>
                                <p class="text-[9px] text-gray-300">
                                    ${maskId(post.author_id)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', cardHtml);
        });
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

document.addEventListener('DOMContentLoaded', () => {
    followingUids = loadFollowing();

    // 首先获取基础元素
    feedContainer = document.getElementById('feedContainer');
    navItems = document.querySelectorAll('nav > div');

    // 关键修复：先获取元素，再加载数据
    window.fetchPosts();

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
    if (nav) {
        nav.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (!navItem) return;
            
            let view = navItem.getAttribute('data-view');
            
            // 【核心整合】：如果点击“家人”，强制重定向到“牵挂线”
            if (view === 'family') {
                view = 'care'; 
            }

            window.switchView(view);
            
            // 根据视图触发数据刷新
            if (view === 'square') {
                window.fetchPosts(feedMode);
            } else if (view === 'care') {
                fetchCareline(); // 刷新牵挂线数据
            }
        });
    }

    // --- 新增：牵挂线页面两个新按钮的点击监听 ---
    // 1. 绑定“我的牵挂码”按钮
    const showMyCodeBtn = document.getElementById('showMyCodeBtn');
    if (showMyCodeBtn) {
        showMyCodeBtn.onclick = () => {
            const codeValue = document.getElementById('codeValue');
            if (codeValue) codeValue.innerText = MY_USER_ID;
            document.getElementById('codeModal').classList.remove('hidden');
        };
    }

    // 2. 绑定“”按钮
    const openFollowModalBtn = document.getElementById('openFollowModalBtn');
    if (openFollowModalBtn) {
        openFollowModalBtn.onclick = () => {
            document.getElementById('followModal').classList.remove('hidden');
        };
    }
    
    // 广场/我的瞬间切换
    const tabAll = document.getElementById('tabAll');
    const tabMine = document.getElementById('tabMine');
    if (tabAll) tabAll.onclick = () => window.fetchPosts('all');
    if (tabMine) tabMine.onclick = () => window.fetchPosts('mine');

    // 牵挂码弹窗
    const inviteBtn = document.getElementById('inviteBtn');
    const codeModal = document.getElementById('codeModal');
    const closeCodeModal = document.getElementById('closeCodeModal');
    const codeValue = document.getElementById('codeValue');
    const copyCode = document.getElementById('copyCode');
    if (codeValue) codeValue.innerText = MY_USER_ID;
    if (inviteBtn && codeModal) {
        inviteBtn.onclick = () => codeModal.classList.remove('hidden');
    }
    if (closeCodeModal && codeModal) closeCodeModal.onclick = () => codeModal.classList.add('hidden');
    if (copyCode && codeValue) {
        copyCode.onclick = async () => {
            try {
                await navigator.clipboard.writeText(codeValue.innerText);
                copyCode.innerText = "已复制";
                setTimeout(() => copyCode.innerText = "复制", 1500);
            } catch {
                alert("复制失败，请手动选择复制");
            }
        };
    }

    // 绑定牵挂人弹窗
    const followBtn = document.getElementById('followBtn');
    const followModal = document.getElementById('followModal');
    const closeFollowModal = document.getElementById('closeFollowModal');
    const followInput = document.getElementById('followInput');
    const saveFollow = document.getElementById('saveFollow');
    if (followBtn && followModal) followBtn.onclick = () => followModal.classList.remove('hidden');
    if (closeFollowModal && followModal) closeFollowModal.onclick = () => followModal.classList.add('hidden');
    if (saveFollow && followInput && followModal) {
        saveFollow.onclick = () => {
            const val = followInput.value.trim();
            if (!val) return;
            const newList = [...followingUids, val];
            saveFollowing(newList);
            followInput.value = '';
            followModal.classList.add('hidden');
            window.switchView('care');
            fetchCareline();
        };
    }

    // 拍照保存等原有逻辑...
    const captureBtn = document.getElementById('captureBtn');
    const video = document.getElementById('video');
    const shutter = document.getElementById('shutter');
    const canvas = document.getElementById('canvas');
    const photo = document.getElementById('photo');

    if (captureBtn) {
        captureBtn.onclick = async () => {
            try {
                captureBtn.disabled = true;
                captureBtn.innerText = "正在启动相机...";
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    } 
                });
                video.srcObject = stream;
                window.switchView('camera');
            } catch (e) {
                console.error('相机错误:', e);
                const errorMsg = e.name === 'NotAllowedError' 
                    ? "请在浏览器设置中开启相机权限" 
                    : e.name === 'NotFoundError'
                    ? "未找到摄像头设备"
                    : "无法访问相机，请检查设备设置";
                alert(errorMsg);
            } finally {
                captureBtn.disabled = false;
                captureBtn.innerHTML = '<span class="text-white text-3xl font-bold tracking-widest">吃了吗</span><span class="text-white/80 text-xs mt-2 font-light">记录生活温度</span>';
            }
        };
    }

    if (shutter) {
        shutter.onclick = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            photo.src = canvas.toDataURL('image/webp', 0.5);
            if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
            window.switchView('preview');
        };
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
                    location: getMealType(), 
                    content: selectedMood || "认真吃饭，保持热爱。",
                    author_id: MY_USER_ID,
                    user_id: MY_USER_ID,
                    cheers: 0,
                    comfort: 0
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
    if (retakeBtn) retakeBtn.onclick = () => captureBtn.click();

    // 盲盒逻辑
    const foods = ["兰州牛肉面", "隆江猪脚饭", "沙县大酒店", "鲜切羊肉粉", "黄焖鸡米饭", "健康沙拉", "凉皮肉夹馍", "麻辣烫", "螺蛳粉","新疆炒米粉","盖浇饭"];
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) {
        spinBtn.onclick = () => {
            const foodResult = document.getElementById('foodResult');
            const healthTip = document.getElementById('healthTip');
            
            if (!foodResult || !healthTip) return;
            
            // 跑马灯效果，带减速效果
            const startTime = Date.now();
            const spinDuration = 1600; // 总滚动时间
            
            const tick = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed >= spinDuration) return;
                
                // 随机显示一个候选项
                const randomPick = foods[Math.floor(Math.random() * foods.length)];
                foodResult.innerText = randomPick;
                
                // 依据剩余时间拉长间隔，实现减速
                const progress = elapsed / spinDuration;
                const nextDelay = 60 + Math.floor(progress * 140); // 60ms -> 200ms
                setTimeout(tick, nextDelay);
            };
            
            foodResult.innerText = "挑选...";
            spinBtn.disabled = true;
            healthTip.classList.add('opacity-0');
            tick();
            
            setTimeout(() => {
                const result = foods[Math.floor(Math.random() * foods.length)];
                foodResult.innerText = result;
                spinBtn.disabled = false;
                
                const tipText = result.includes("沙拉") 
                    ? "✨ 选了健康的一餐！" 
                    : result.includes("麻辣") || result.includes("螺蛳")
                    ? "🌶️ 重口味警告！"
                    : "命运安排，吃它！😋";
                
                healthTip.innerText = tipText;
                healthTip.classList.remove('opacity-0');
            }, spinDuration);
        };
    }

    // 牵挂线初始拉取
    const careView = document.getElementById('careView');
    if (careView) {
        // 预加载一次，让空状态及时展示
        fetchCareline();
    }
});

// --- 4. 互动与弹窗逻辑 ---

window.handleInteraction = async (postId, type, btnElement) => {
    const storageKey = `${type}_${postId}`;
    if (localStorage.getItem(storageKey)) return;
    
    // 防止重复点击
    if (btnElement.disabled) return;
    btnElement.disabled = true;
    
    const countSpan = btnElement.querySelector('span:last-child');
    let currentCount = parseInt(countSpan.innerText) || 0;
    
    // 立即更新UI（乐观更新）
    countSpan.innerText = currentCount + 1;
    btnElement.classList.add('opacity-50', 'grayscale', 'pointer-events-none');
    localStorage.setItem(storageKey, 'true');
    
    try {
        const { data } = await supabaseClient.from('posts').select(type).eq('id', postId).single();
        const dbCount = (data && data[type]) ? data[type] : 0;
        await supabaseClient.from('posts').update({ [type]: dbCount + 1 }).eq('id', postId);
    } catch (err) {
        console.error('互动失败:', err);
        // 回滚UI更新
        countSpan.innerText = currentCount;
        btnElement.classList.remove('opacity-50', 'grayscale', 'pointer-events-none');
        localStorage.removeItem(storageKey);
        btnElement.disabled = false;
    }
};

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

    careList.innerHTML = '<div class="skeleton w-full h-32 rounded-2xl"></div>';
    if (careEmpty) careEmpty.classList.add('hidden');

    // 关键排查：确保 followingUids 存在且是数组
    if (typeof followingUids === 'undefined' || !followingUids || followingUids.length === 0) {
        careList.innerHTML = '';
        if (careEmpty) careEmpty.classList.remove('hidden');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .in('author_id', followingUids)
            .order('created_at', { ascending: false });

        if (error) throw error;

        careList.innerHTML = '';

        followingUids.forEach(uid => {
            const allUserPosts = (data || []).filter(p => p.author_id === uid);
            const todayStr = new Date().toDateString();
            const todayPosts = allUserPosts.filter(p => new Date(p.created_at).toDateString() === todayStr);

            if (allUserPosts.length === 0) {
                // 状态 A：从未打卡（显示占位）
                careList.insertAdjacentHTML('beforeend', `
                    <div class="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm border-care-soft animate-care-pulse mb-3">
                        <div class="flex items-center justify-between mb-2">
                            <div class="text-[10px] text-gray-400">牵挂码：${String(uid).slice(-8)}</div>
                            <span class="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-full">今日未见打卡</span>
                        </div>
                        <p class="text-gray-700 text-sm">尚未看到 TA 的用餐记录，要不去轻声问候一下？</p>
                    </div>
                `);
            } else {
                const latest = allUserPosts[0];
                
                // 容错处理：确保 formatRelativeTime 存在，否则给个默认字符串
                const lastTimeText = typeof formatRelativeTime === 'function' 
                    ? formatRelativeTime(latest.created_at, latest.location || '')
                    : '最近有在认真吃饭';

                const now = new Date();
                const hour = now.getHours();
                const hasLunch = todayPosts.some(p => (p.location || '').includes('午餐'));
                const hasDinner = todayPosts.some(p => (p.location || '').includes('晚餐'));

                let isSoftAlert = false;
                let statusText = '';
                let statusBadge = '';

                // 温和提醒逻辑（图片框架背景变动的触发开关）
                if (hour >= 20 && !hasDinner) {
                    isSoftAlert = true;
                    statusText = "尚未看到 TA 的晚餐记录，要不去温柔问候一下？";
                    statusBadge = '<span class="text-xs text-orange-500 bg-orange-100/50 px-2 py-1 rounded-full">晚餐未见记录</span>';
                } else if (hour >= 14 && !hasLunch) {
                    isSoftAlert = true;
                    statusText = "尚未看到 TA 的午餐记录，要不去轻轻问候一下？";
                    statusBadge = '<span class="text-xs text-orange-500 bg-orange-100/50 px-2 py-1 rounded-full">午餐未见记录</span>';
                } else {
                    isSoftAlert = false;
                    statusText = `TA 已好好吃过这顿饭啦（${lastTimeText}）`;
                    statusBadge = '<span class="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">今日已打卡</span>';
                }

                // 重点：这里就是你说的“变动图片框架背景”
                // 如果触发提醒，使用 border-care-soft（淡橙色）和 脉冲动画
                const cardBorderClass = isSoftAlert 
                    ? 'border-orange-200 bg-orange-50/30 animate-care-pulse shadow-md shadow-orange-50' 
                    : 'border-green-100 bg-white';

                careList.insertAdjacentHTML('beforeend', `
                    <div class="border-2 ${cardBorderClass} rounded-2xl p-4 flex gap-3 mb-3 transition-all duration-500">
                        <div class="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-50">
                            <img src="${latest.image_url}" alt="记录照片" class="w-full h-full object-cover" loading="lazy">
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2">
                                <div class="text-[10px] text-gray-400 truncate">牵挂码：${String(uid).slice(-8)}</div>
                                ${statusBadge}
                            </div>
                            <p class="text-gray-900 font-bold mt-1 text-sm truncate">${latest.content || '认真吃饭，保持热爱。'}</p>
                            <p class="text-[11px] text-gray-500 mt-1 line-clamp-1">${statusText}</p>
                        </div>
                    </div>
                `);
            }
        });
    } catch (err) {
        console.error('牵挂线加载失败:', err);
        careList.innerHTML = '<p class="text-center text-red-400 py-6">加载失败，请检查网络</p>';
    }
}
