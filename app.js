// --- 1. 基础配置与全局变量 ---
function getUserId() {
    let userId = localStorage.getItem('dinner_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('dinner_user_id', userId);
    }
    return userId;
}
const MY_USER_ID = getUserId();

function getMealType() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return "晨光早餐 ☕";
    if (hour >= 10 && hour < 14) return "忙碌午餐 🍱";
    if (hour >= 14 && hour < 17) return "悠哉午茶 🍵";
    if (hour >= 17 && hour < 21) return "治愈晚餐 🍲";
    return "深夜食堂 🌙";
}

const SUPABASE_URL = 'https://qzlljyrtxcxwzwqacvpy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BTWyerGQTZNktmx7wIROIg_wQGvFsxm';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 全局变量声明
let feedContainer;
let navItems;
let selectedMood = ""; 

// --- 2. 核心功能函数 (挂载到 window 确保 HTML onclick 可用) ---

window.switchView = function(viewName) {
    const allViews = {
        start: document.getElementById('startView'),
        camera: document.getElementById('cameraView'),
        preview: document.getElementById('photoPreview'),
        square: document.getElementById('squareView'),
        family: document.getElementById('familyView'),
        discovery: document.getElementById('discoveryView'),
        match: document.getElementById('matchModal')
    };

    Object.values(allViews).forEach(v => { if (v) v.classList.add('hidden'); });
    if (allViews[viewName]) allViews[viewName].classList.remove('hidden');

    const nav = document.querySelector('nav');
    if (nav) {
        if (viewName === 'camera' || viewName === 'preview') nav.classList.add('hidden');
        else nav.classList.remove('hidden');
    }
    
    const items = document.querySelectorAll('nav > div');
    items.forEach((item, idx) => {
        const isActive = (viewName === 'square' && idx === 0) || 
                       (viewName === 'start' && idx === 1) || 
                       (viewName === 'discovery' && idx === 2) || 
                       (viewName === 'family' && idx === 3);
        item.classList.toggle('text-orange-500', isActive);
        item.classList.toggle('text-gray-400', !isActive);
    });
};

window.fetchPosts = async function() {
    // 关键修复：如果还没获取到容器，现场获取一次
    if (!feedContainer) feedContainer = document.getElementById('feedContainer');
    if (!feedContainer) return;

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
        const hasCheered = localStorage.getItem(`cheers_${post.id}`);
        const hasComforted = localStorage.getItem(`comfort_${post.id}`);
        const cheersClass = hasCheered ? 'opacity-50 grayscale pointer-events-none' : '';
        const comfortClass = hasComforted ? 'opacity-50 grayscale pointer-events-none' : '';

        const html = `
            <div class="bg-white p-4 rounded-[2.5rem] shadow-sm border border-orange-50 mb-8">
            <div class="relative rounded-[2rem] overflow-hidden mb-4 shadow-inner">
                <img src="${post.image_url}" class="w-full h-80 object-cover">
                <div class="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full">
                    <span class="text-white text-[10px] font-bold">${post.location || '美味瞬间'}</span>
                </div>
            </div>
            <div class="px-3">
                <div class="mb-3"><span class="text-lg font-bold text-gray-800">${post.content || '认真吃饭，保持热爱。'}</span></div>
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
                    <p class="text-[10px] text-gray-400 font-light">${formatTime(post.created_at)} · 记录于此刻烟火</p>
                </div>
            </div>
        </div>`;
        feedContainer.insertAdjacentHTML('beforeend', html);
    });
};

function formatTime(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diff = Math.floor((now - past) / 1000 / 60);
    if (diff < 1) return "刚刚";
    if (diff < 60) return `${diff}分钟前`;
    return past.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- 3. 页面初始化 ---

document.addEventListener('DOMContentLoaded', () => {
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

    // 导航点击
    if (navItems.length >= 4) {
        navItems[0].onclick = () => { window.switchView('square'); window.fetchPosts(); };
        navItems[1].onclick = () => window.switchView('start');
        navItems[2].onclick = () => window.switchView('discovery');
        navItems[3].onclick = () => window.switchView('family');
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
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                video.srcObject = stream;
                window.switchView('camera');
            } catch (e) { alert("请在浏览器设置中开启相机权限"); }
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
            if (!photo.src || photo.src.startsWith('data:image/gif')) return;
            saveBtn.disabled = true;
            saveBtn.innerText = "正在存档...";
            try {
                const { data, error } = await supabaseClient.from('posts').insert([{ 
                    image_url: photo.src, location: getMealType(), 
                    content: selectedMood || "认真吃饭，保持热爱。",
                    user_id: MY_USER_ID 
                }]).select();
                if (error) throw error;
                const myNewId = data ? data[0].id : null;
                if (typeof showRandomMatch === 'function') showRandomMatch(myNewId);
                else { window.switchView('square'); window.fetchPosts(); }
            } catch (err) {
                alert("发布失败: " + err.message);
                saveBtn.disabled = false;
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
            foodResult.innerText = "挑选...";
            spinBtn.disabled = true;
            setTimeout(() => {
                const result = foods[Math.floor(Math.random() * foods.length)];
                foodResult.innerText = result;
                spinBtn.disabled = false;
                healthTip.innerText = result.includes("沙拉") ? "✨ 选了健康的一餐！" : "命运安排，吃它！😋";
                healthTip.classList.remove('opacity-0');
            }, 800);
        };
    }
});

// --- 4. 互动与弹窗逻辑 ---

window.handleInteraction = async (postId, type, btnElement) => {
    const storageKey = `${type}_${postId}`;
    if (localStorage.getItem(storageKey)) return; 
    const countSpan = btnElement.querySelector('span:last-child');
    let currentCount = parseInt(countSpan.innerText) || 0;
    countSpan.innerText = currentCount + 1;
    btnElement.classList.add('opacity-50', 'grayscale', 'pointer-events-none');
    localStorage.setItem(storageKey, 'true');
    try {
        const { data } = await supabaseClient.from('posts').select(type).eq('id', postId).single();
        const dbCount = (data && data[type]) ? data[type] : 0;
        await supabaseClient.from('posts').update({ [type]: dbCount + 1 }).eq('id', postId);
    } catch (err) { console.error(err); }
};

async function showRandomMatch(excludeId) {
    const modal = document.getElementById('matchModal');
    const loading = document.getElementById('matchLoading');
    const content = document.getElementById('matchContent');
    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    content.classList.add('hidden');
    try {
        const { data, error } = await supabaseClient.from('posts').select('*').neq('id', excludeId).limit(30);
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!error && data && data.length > 0) {
            const randomPost = data[Math.floor(Math.random() * data.length)];
            document.getElementById('matchImage').src = randomPost.image_url;
            document.getElementById('matchMood').innerText = randomPost.content || "认真吃饭";
            document.getElementById('matchLocation').innerText = `— 记录于 ${randomPost.location || '烟火世界'}`;
            loading.classList.add('hidden');
            content.classList.remove('hidden');
        } else { window.closeMatch(); }
    } catch (err) { window.closeMatch(); }
}

window.closeMatch = () => {
    const modal = document.getElementById('matchModal');
    if (modal) modal.classList.add('hidden');
    window.switchView('square');
    window.fetchPosts();
};
