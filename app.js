document.addEventListener('DOMContentLoaded', () => {
    // 页面元素
    const views = {
        start: document.getElementById('startView'),
        camera: document.getElementById('cameraView'),
        preview: document.getElementById('photoPreview'),
        square: document.getElementById('squareView'),
        family: document.getElementById('familyView'), // <-- 刚才这里漏了逗号，补上啦！
        discovery: document.getElementById('discoveryView')
    };

    const navItems = document.querySelectorAll('nav > div');
    const feedContainer = document.getElementById('feedContainer');

    // 1. 核心导航切换函数
    function switchView(viewName) {
        // 隐藏所有页面
        Object.values(views).forEach(v => {
            if (v) v.classList.add('hidden'); // 增加一个保险判断
        });
        
        // 显示目标页面
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }

        // 显示导航栏 (除非是在相机页)
        const nav = document.querySelector('nav');
        if (nav) nav.classList.toggle('hidden', viewName === 'camera');
        
        // 更新导航图标颜色 (支持 4 个按钮)
        navItems.forEach((item, idx) => {
            const isSquare = (viewName === 'square' && idx === 0);
            const isHome = (viewName === 'start' && idx === 1);
            const isDiscovery = (viewName === 'discovery' && idx === 2);
            const isFamily = (viewName === 'family' && idx === 3);
            
            if (isSquare || isHome || isDiscovery || isFamily) {
                item.classList.add('text-orange-500');
                item.classList.remove('text-gray-400');
            } else {
                item.classList.remove('text-orange-500');
                item.classList.add('text-gray-400');
            }
        });
    }

    // 2. 绑定导航点击事件
    if (navItems.length >= 4) {
        navItems[0].onclick = () => switchView('square');    // 广场
        navItems[1].onclick = () => switchView('start');     // 首页
        navItems[2].onclick = () => switchView('discovery'); // 今天吃啥
        navItems[3].onclick = () => switchView('family');    // 家人
    }
 
    // 3. 拍照逻辑
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
                switchView('camera');
            } catch (e) { alert("请允许相机权限"); }
        };
    }

    if (shutter) {
        shutter.onclick = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            photo.src = canvas.toDataURL('image/png');
            video.srcObject.getTracks().forEach(t => t.stop());
            switchView('preview');
        };
    }

    // 4. 发布逻辑
    const saveBtn = document.getElementById('save');
    if (saveBtn) {
        saveBtn.onclick = () => {
            const newPost = `<div class="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-orange-50 mb-6">
                <img src="${photo.src}" class="w-full h-72 object-cover">
                <div class="p-6"><p class="text-lg font-medium text-gray-800">刚刚 正在吃饭</p></div>
            </div>`;
            if (feedContainer) feedContainer.insertAdjacentHTML('afterbegin', newPost);
            switchView('square');
            alert("发布成功！");
        };
    }

    const retakeBtn = document.getElementById('retake');
    if (retakeBtn) {
        retakeBtn.onclick = () => captureBtn.click();
    }

// === 这里是【今天吃啥】盲盒转盘逻辑 ===
    const foods = ["兰州牛肉面", "沙县大酒店", "隆江猪脚饭", "黄焖鸡米饭", "减脂轻食沙拉", "凉皮肉夹馍", "万能麻辣烫", "烤肉拌饭", "新疆炒米粉", "螺蛳粉"];
    const spinBtn = document.getElementById('spinBtn');
    const foodResult = document.getElementById('foodResult');
    const healthTip = document.getElementById('healthTip');

    if (spinBtn) {
        spinBtn.onclick = () => {
            // 1. 开始转动效果
            spinBtn.disabled = true;
            spinBtn.innerText = "命运抽取中...";
            foodResult.classList.add('slot-animate'); // 加入跳动动画
            healthTip.classList.add('opacity-0');

            // 2. 模拟快速跳动的文字
            let counter = 0;
            const timer = setInterval(() => {
                foodResult.innerText = foods[Math.floor(Math.random() * foods.length)];
                counter++;
            }, 100);

            // 3. 2秒后停止并出结果
            setTimeout(() => {
                clearInterval(timer); // 停止跳动
                foodResult.classList.remove('slot-animate'); // 移除动画
                
                const result = foods[Math.floor(Math.random() * foods.length)];
                foodResult.innerText = result; // 最终定格
                
                spinBtn.disabled = false;
                spinBtn.innerText = "再转一次";
                
                // 4. 显示温馨提示
                healthTip.classList.remove('opacity-0');
                if(result.includes("轻食") || result.includes("沙拉")) {
                    healthTip.innerText = "✨ 今天选了健康的一餐，真棒！";
                } else {
                    healthTip.innerText = "命运安排，就吃这个吧！😋";
                }
            }, 1500); // 1.5秒后出结果
        };
    }
});