const SUPABASE_URL = 'https://qzlljyrtxcxwzwqacvpy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BTWyerGQTZNktmx7wIROIg_wQGvFsxm'; // 建议后续改用 anon key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
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

    // --- 核心切换逻辑 ---
    // --- 核心切换逻辑 (修复版) ---
    function switchView(viewName) {
        Object.values(views).forEach(v => v && v.classList.add('hidden'));
        if (views[viewName]) views[viewName].classList.remove('hidden');

        const nav = document.querySelector('nav');
        // 关键修复：拍照(camera) 和 预览(preview) 时，都要隐藏导航栏
        if (nav) {
            if (viewName === 'camera' || viewName === 'preview') {
                nav.classList.add('hidden');
            } else {
                nav.classList.remove('hidden');
            }
        }
        
        // 更新导航高亮
        navItems.forEach((item, idx) => {
            const isActive = (viewName === 'square' && idx === 0) || 
                           (viewName === 'start' && idx === 1) || 
                           (viewName === 'discovery' && idx === 2) || 
                           (viewName === 'family' && idx === 3);
            item.classList.toggle('text-orange-500', isActive);
            item.classList.toggle('text-gray-400', !isActive);
        });
    }

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
            const html = `
                <div class="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-orange-50 mb-8 transition-all hover:shadow-md">
                    <div class="relative">
                        <img src="${post.image_url}" class="w-full h-80 object-cover">
                        <div class="absolute bottom-4 right-4">
                            <button onclick="handleCheers(${post.id}, this)" class="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 active:scale-90 transition-all border border-orange-100">
                                <span class="text-xl">🍻</span>
                                <span class="font-bold text-orange-600">${post.cheers || 0}</span>
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-lg">🍲</div>
                            <div>
                                <p class="font-bold text-gray-800 text-sm">温暖的饭友</p>
                                <p class="text-[10px] text-gray-400">${formatTime(post.created_at)}</p>
                            </div>
                        </div>
                        <p class="text-gray-600 text-sm leading-relaxed font-light">
                            “在此刻，全世界有 1280 人和你一样，正在认真对待食物。”
                        </p>
                    </div>
                </div>`;
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
    navItems[0].onclick = () => { switchView('square'); fetchPosts(); };
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

// --- 联网发布逻辑 (修复版) ---
document.getElementById('save').onclick = async () => {
    const btn = document.getElementById('save');
    
    // 1. 基础检查
    if (!photo.src || photo.src.startsWith('data:image/gif')) {
        alert("照片好像没拍好，请重拍一下");
        return;
    }

    btn.disabled = true;
    btn.innerText = "正在同步至云端...";

    try {
        // 2. 执行插入
        // 这里的 image_url 对应你数据库里的列名
        const { data, error } = await supabaseClient
            .from('posts')
            .insert([
                { image_url: photo.src } 
            ]);

        if (error) {
            // 如果报错，直接弹出错误原因
            console.error("数据库报错:", error);
            alert("发布失败: " + error.message + "\n请检查数据库 image_url 是否为 text 类型。");
            btn.disabled = false;
            btn.innerText = "重新尝试发布";
        } else {
            // 3. 成功后的反馈
            alert("发布成功！");
            switchView('square'); // 自动跳到广场
            fetchPosts();  // 刷新广场内容
        }
    } catch (err) {
        console.error("代码执行异常:", err);
        alert("发生了未知错误，请检查网络");
        btn.disabled = false;
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
    // 全局函数，方便 HTML 里的 onclick 调用
    window.handleCheers = async (postId, btnElement) => {
        // 1. 前端即时反馈 (让用户感觉很快)
        const countSpan = btnElement.querySelector('span:last-child');
        let currentCount = parseInt(countSpan.innerText);
        countSpan.innerText = currentCount + 1;
        
        // 2. 同步到云端数据库
        const { error } = await supabaseClient.rpc('increment_cheers', { row_id: postId });
        
        if (error) {
            // 如果云端失败，可以在这里回滚（目前为了爽快感先不回滚）
            console.error('干杯失败:', error);
        }
    };
});
