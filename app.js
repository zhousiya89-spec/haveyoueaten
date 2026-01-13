// 获取或创建一个唯一的设备ID
function getUserId() {
    let userId = localStorage.getItem('dinner_user_id');
    if (!userId) {
        // 如果没有，就生成一个随机ID，比如 "user_8j2f9"
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('dinner_user_id', userId);
    }
    return userId;
}
const MY_USER_ID = getUserId(); // 以后发布照片就带上这个 ID
function getMealType() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return "晨光早餐 ☕";
    if (hour >= 10 && hour < 14) return "忙碌午餐 🍱";
    if (hour >= 14 && hour < 17) return "悠哉午茶 🍵";
    if (hour >= 17 && hour < 21) return "治愈晚餐 🍲";
    return "深夜食堂 🌙";
}
// 1. 初始化 Supabase 客户端
const SUPABASE_URL = 'https://qzlljyrtxcxwzwqacvpy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BTWyerGQTZNktmx7wIROIg_wQGvFsxm'; // 建议后续改用 anon key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    let selectedMood = ""; // 用来存储选中的心情

// 给所有标签绑定点击事件
document.querySelectorAll('.mood-tag').forEach(tag => {
    tag.onclick = () => {
        // 先重置所有标签样式
        document.querySelectorAll('.mood-tag').forEach(t => {
            t.classList.replace('bg-orange-500', 'bg-white');
            t.classList.replace('text-white', 'text-gray-600');
        });
        // 高亮当前选中的
        tag.classList.replace('bg-white', 'bg-orange-500');
        tag.classList.replace('text-gray-600', 'text-white');
        selectedMood = tag.getAttribute('data-mood');
    };
});
    // 页面元素定义
    const views = {
        start: document.getElementById('startView'),
        camera: document.getElementById('cameraView'),
        preview: document.getElementById('photoPreview'),
        square: document.getElementById('squareView'),
        family: document.getElementById('familyView'),
        discovery: document.getElementById('discoveryView')
    };

    const navItems = document.querySelectorAll('nav > div');
    const feedContainer = document.getElementById('feedContainer');
// --- 核心切换逻辑 (全局版) ---
window.switchView = function(viewName) {
    // 1. 获取所有视图元素
    const allViews = {
        start: document.getElementById('startView'),
        camera: document.getElementById('cameraView'),
        preview: document.getElementById('photoPreview'),
        square: document.getElementById('squareView'),
        family: document.getElementById('familyView'),
        discovery: document.getElementById('discoveryView'),
        match: document.getElementById('matchModal')
    };

    // 2. 隐藏所有视图
    Object.values(allViews).forEach(v => {
        if (v) v.classList.add('hidden');
    });

    // 3. 显示目标视图
    if (allViews[viewName]) {
        allViews[viewName].classList.remove('hidden');
    }

    // 4. 处理导航栏显示/隐藏
    const nav = document.querySelector('nav');
    if (nav) {
        if (viewName === 'camera' || viewName === 'preview') {
            nav.classList.add('hidden');
        } else {
            nav.classList.remove('hidden');
        }
    }
    
    // 5. 更新导航栏图标高亮状态
    const navItems = document.querySelectorAll('nav > div');
    navItems.forEach((item, idx) => {
        // 根据索引判断哪个图标该变色
        const isActive = (viewName === 'square' && idx === 0) || 
                       (viewName === 'start' && idx === 1) || 
                       (viewName === 'discovery' && idx === 2) || 
                       (viewName === 'family' && idx === 3);
        item.classList.toggle('text-orange-500', isActive);
        item.classList.toggle('text-gray-400', !isActive);
    });
};
    // --- 联网功能：拉取云端动态 ---
    // --- 联网功能：拉取云端动态 ---
    async function fetchPosts() {
        feedContainer.innerHTML = '<p class="text-center text-gray-400 py-10">正在寻找烟火气...</p>';
        
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            feedContainer.innerHTML = '<p class="text-center text-red-400 py-10">加载失败</p>';
            return;
        }

        feedContainer.innerHTML = '';
            data.forEach(post => {
                // 1. 先检查本地存储，看看这个设备是否点过赞
                const hasCheered = localStorage.getItem(`cheers_${post.id}`);
                const hasComforted = localStorage.getItem(`comfort_${post.id}`);
    
                // 2. 根据是否点过，准备好 CSS 类名
                // 如果点过了，就加上灰度、半透明、禁用点击的样式
                const cheersClass = hasCheered ? 'opacity-50 grayscale pointer-events-none' : '';
                const comfortClass = hasComforted ? 'opacity-50 grayscale pointer-events-none' : '';
    
                // 3. 构建 HTML (重点看按钮里的 ${post.cheers || 0})
                const html = `
                    <div class="bg-white p-4 rounded-[2.5rem] shadow-sm border border-orange-50 mb-8">
                    <div class="relative rounded-[2rem] overflow-hidden mb-4 shadow-inner">
                        <img src="${post.image_url}" class="w-full h-80 object-cover">
                        <div class="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                            <span class="text-white text-[10px] font-bold">${post.location || '美味瞬间'}</span>
                        </div>
                    </div>
                    
                    <div class="px-3">
                        <div class="mb-3">
                            <span class="text-lg font-bold text-gray-800">${post.content || '认真吃饭，保持热爱。'}</span>
                        </div>
    
                        <div class="flex gap-3 mb-4">
                            <button onclick="handleInteraction(${post.id}, 'cheers', this)" 
                                    class="flex items-center gap-1.5 bg-orange-50 px-4 py-2 rounded-full border border-orange-100 active:scale-95 transition-all ${cheersClass}">
                                <span class="text-lg">🍻</span>
                                <span class="font-bold text-orange-600 text-sm">${post.cheers || 0}</span>
                            </button>
                            
                            <button onclick="handleInteraction(${post.id}, 'comfort', this)" 
                                    class="flex items-center gap-1.5 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 active:scale-95 transition-all ${comfortClass}">
                                <span class="text-lg">🖐️</span>
                                <span class="font-bold text-blue-600 text-sm">${post.comfort || 0}</span>
                            </button>
                        </div>
                        
                        <div class="flex items-center gap-2">
                            <div class="w-1 h-1 bg-orange-400 rounded-full"></div>
                            <p class="text-[10px] text-gray-400 font-light">
                                ${formatTime(post.created_at)} · 记录于此刻烟火
                            </p>
                        </div>
                    </div>
                </div>`;
                
                // 将生成的卡片放入容器
                feedContainer.insertAdjacentHTML('beforeend', html);
            });
    }

    // 时间格式化小工具
    function formatTime(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diff = Math.floor((now - past) / 1000 / 60); // 分钟差
        if (diff < 1) return "刚刚";
        if (diff < 60) return `${diff}分钟前`;
        return past.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // --- 交互绑定 ---
    navItems[0].onclick = () => { window.switchView('square'); window.fetchPosts(); };
    navItems[1].onclick = () => switchView('start');
    navItems[2].onclick = () => switchView('discovery');
    navItems[3].onclick = () => switchView('family');

    // 拍照功能
    const captureBtn = document.getElementById('captureBtn');
    const video = document.getElementById('video');
    const shutter = document.getElementById('shutter');
    const canvas = document.getElementById('canvas');
    const photo = document.getElementById('photo');

    captureBtn.onclick = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            switchView('camera');
        } catch (e) { alert("请在浏览器设置中开启相机权限"); }
    };

    shutter.onclick = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        photo.src = canvas.toDataURL('image/webp', 0.5); // 使用webp并压缩画质以节省云端空间
        video.srcObject.getTracks().forEach(t => t.stop());
        switchView('preview');
    };

// --- 联网发布逻辑 (完美修正版) ---
document.getElementById('save').onclick = async () => {
    const btn = document.getElementById('save');
    // 1. 基础检查：照片必须存在
    if (!photo.src || photo.src.startsWith('data:image/gif')) {
        alert("照片好像没拍好，请重拍一下");
        return;
    }

    // 2. 界面反馈：禁用按钮防止连点
    btn.disabled = true;
    btn.innerText = "正在存档瞬间...";

    // 3. 准备自动化数据
    const mealType = getMealType(); // 获取饭点

    try {
        // 4. 执行插入 (注意这里加上了 user_id 和 .select())
        const { data, error } = await supabaseClient
            .from('posts')
            .insert([
                { 
                    image_url: photo.src,
                    location: mealType, 
                    content: selectedMood || "认真吃饭，保持热爱。",
                    user_id: MY_USER_ID // 必须确保你在文件顶部定义了 MY_USER_ID
                } 
            ])
            .select(); // 加上 select 才能拿到新数据的 ID 用于匹配

        if (error) {
            console.error("数据库报错:", error);
            alert("发布失败: " + error.message);
            btn.disabled = false;
            btn.innerText = "重新尝试发布";
        } else {
            // 5. 成功后的新流程：启动浪漫匹配
            const myNewId = data ? data[0].id : null;
            
            // 如果你之前加了匹配动画，这里直接调用
            if (typeof showRandomMatch === 'function') {
                showRandomMatch(myNewId);
            } else {
                alert("瞬间已存档 ✨");
                switchView('square'); 
                fetchPosts();
            }
            
            selectedMood = ""; // 重置心情
        }
    } catch (err) {
        console.error("代码执行异常:", err);
        alert("发生了未知错误");
        btn.disabled = false;
        btn.innerText = "重新尝试发布";
    }
};
    document.getElementById('retake').onclick = () => captureBtn.click();

    // 盲盒转盘逻辑保持不变...
    const foods = ["兰州牛肉面", "隆江猪脚饭", "沙县大酒店", "鲜切羊肉粉", "黄焖鸡米饭", "健康沙拉", "凉皮肉夹馍", "麻辣烫", "螺蛳粉","新疆炒米粉","盖浇饭"];
    const spinBtn = document.getElementById('spinBtn');
    const foodResult = document.getElementById('foodResult');
    const healthTip = document.getElementById('healthTip');

    if (spinBtn) {
        spinBtn.onclick = () => {
            foodResult.innerText = "挑选...";
            spinBtn.disabled = true;
            healthTip.classList.add('opacity-0');
            setTimeout(() => {
                const result = foods[Math.floor(Math.random() * foods.length)];
                foodResult.innerText = result;
                spinBtn.disabled = false;
                healthTip.classList.remove('opacity-0');
                healthTip.innerText = result.includes("沙拉") ? "✨ 选了健康的一餐！" : "命运安排，吃它！😋";
            }, 800);
        };
    }
});
// --- 文件最末尾 ---
// 统一处理：干杯 和 摸摸头 (全局函数)
window.handleInteraction = async (postId, type, btnElement) => {
    const storageKey = `${type}_${postId}`;
    if (localStorage.getItem(storageKey)) return; 

    // 1. 获取当前显示的数字
    const countSpan = btnElement.querySelector('span:last-child');
    let currentCount = parseInt(countSpan.innerText) || 0;
    let newCount = currentCount + 1;

    // 2. 立即更新前端界面 (不管数据库，先给用户反馈)
    countSpan.innerText = newCount;
    btnElement.classList.add('opacity-50', 'grayscale', 'pointer-events-none');
    localStorage.setItem(storageKey, 'true');

    // 3. 同步到数据库
    try {
        // 先获取最新的数据，确保我们不是在 NULL 上做加法
        const { data: currentPost } = await supabaseClient
            .from('posts')
            .select(type)
            .eq('id', postId)
            .single();

        // 如果数据库里是空的，dbCount 就设为 0
        const dbCount = (currentPost && currentPost[type]) ? currentPost[type] : 0;
        const finalCount = dbCount + 1;

        const { error } = await supabaseClient
            .from('posts')
            .update({ [type]: finalCount })
            .eq('id', postId);
        
        if (error) throw error;
    } catch (err) {
        console.error('更新失败:', err);
        // 如果失败了，撤销本地状态，允许重试
        localStorage.removeItem(storageKey);
        btnElement.classList.remove('opacity-50', 'grayscale', 'pointer-events-none');
        countSpan.innerText = currentCount;
    }
};
async function showRandomMatch(excludeId) {
    const modal = document.getElementById('matchModal');
    const loading = document.getElementById('matchLoading');
    const content = document.getElementById('matchContent');
    
    const matchImg = document.getElementById('matchImage');
    const matchMood = document.getElementById('matchMood');
    const matchLoc = document.getElementById('matchLocation');

    // 1. 初始化状态：显示弹窗，展示动画，隐藏内容
    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    content.classList.add('hidden');

    try {
        // 2. 提前拉取数据（为了后续展示不卡顿）
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .neq('id', excludeId)
            .limit(30);

        // 3. 人为制造“寻找中”的延迟 (1.5秒 - 2秒)
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!error && data && data.length > 0) {
            const randomPost = data[Math.floor(Math.random() * data.length)];
            
            // 填充内容
            matchImg.src = randomPost.image_url;
            matchMood.innerText = randomPost.content || "认真吃饭";
            matchLoc.innerText = `— 记录于 ${randomPost.location || '烟火世界'}`;
            
            // 4. 切换显示层
            loading.classList.add('hidden');
            content.classList.remove('hidden');
        } else {
            // 如果没有人，悄悄关闭
            closeMatch();
        }
    } catch (err) {
        console.error("匹配异常:", err);
        closeMatch();
    }
}
// --- 必须放在文件最底部，且确保是 window. 属性 ---

window.closeMatch = () => {
    // 1. 隐藏弹窗
    const modal = document.getElementById('matchModal');
    if (modal) {
        modal.classList.add('hidden');
    }

    // 2. 切换到广场视图
    // 这里的 switchView 必须是你在 DOMContentLoaded 内部定义的那个函数
    // 如果无法直接调用，我们需要确保 switchView 也是全局的
    if (typeof switchView === 'function') {
        switchView('square');
    } else {
        // 如果 switchView 报错，尝试直接操作 DOM
        document.querySelectorAll('main > div').forEach(v => v.classList.add('hidden'));
        document.getElementById('squareView').classList.remove('hidden');
        
        // 更新导航栏颜色（可选）
        const navItems = document.querySelectorAll('nav > div');
        navItems.forEach((item, idx) => {
            item.classList.toggle('text-orange-500', idx === 0);
            item.classList.toggle('text-gray-400', idx !== 0);
        });
    }

    // 3. 刷新广场数据
    if (typeof fetchPosts === 'function') {
        fetchPosts();
    }
};
