// NodeShot Chrome Extension Content Script
// 实现元素选择、高亮预览和交互功能

class NodeShot {
  constructor() {
    this.isActive = false;
    this.highlightElement = null;
    this.currentTarget = null;
    this.settings = null;
    this.overlay = null;
    this.mutationObserver = null;

    // 绑定事件处理函数，确保引用一致
    this.boundHandleMouseOver = this.handleMouseOver.bind(this);
    this.boundHandleMouseOut = this.handleMouseOut.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleScroll = this.handleScroll.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);

    this.init();
  }

  async init() {
    // 获取设置
    await this.loadSettings();

    // 创建高亮覆盖层
    this.createOverlay();

    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'activate':
          this.activate();
          break;
        case 'deactivate':
          this.deactivate();
          break;
        case 'cropImage':
          this.cropImage(request.dataUrl, request.elementInfo)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // 保持消息通道开放
      }
    });
  }

  // 加载设置
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response.success) {
          this.settings = response.settings;
        }
        resolve();
      });
    });
  }

  // 创建高亮覆盖层
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'nodeshot-overlay';
    this.overlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 999999;
      border: 2px solid #4285F4;
      background: rgba(66, 133, 244, 0.1);
      display: none;
      box-sizing: border-box;
      transition: all 0.1s ease;
    `;
    document.body.appendChild(this.overlay);
  }



  // 激活截图模式
  activate() {
    if (this.isActive) return;

    this.isActive = true;
    document.body.style.cursor = 'crosshair';

    // 添加事件监听器
    document.addEventListener('mouseover', this.boundHandleMouseOver, true);
    document.addEventListener('mouseout', this.boundHandleMouseOut, true);
    document.addEventListener('click', this.boundHandleClick, true);
    document.addEventListener('keydown', this.boundHandleKeyDown, true);
    window.addEventListener('scroll', this.boundHandleScroll, true);
    window.addEventListener('resize', this.boundHandleResize, true);

    // 启动DOM变化监听
    this.startMutationObserver();

    // 显示激活提示
    this.showNotification('NodeShot已激活，移动鼠标选择元素，点击截图，按ESC退出');
  }

  // 停用截图模式
  deactivate() {
    if (!this.isActive) return;

    this.isActive = false;
    document.body.style.cursor = '';

    // 移除事件监听器
    document.removeEventListener('mouseover', this.boundHandleMouseOver, true);
    document.removeEventListener('mouseout', this.boundHandleMouseOut, true);
    document.removeEventListener('click', this.boundHandleClick, true);
    document.removeEventListener('keydown', this.boundHandleKeyDown, true);
    window.removeEventListener('scroll', this.boundHandleScroll, true);
    window.removeEventListener('resize', this.boundHandleResize, true);

    // 停止DOM变化监听
    this.stopMutationObserver();

    // 隐藏高亮
    this.hideHighlight();

    this.showNotification('NodeShot已退出');
  }

  // 鼠标悬停事件
  handleMouseOver(event) {
    if (!this.isActive) return;

    event.stopPropagation();

    const target = event.target;

    // 忽略插件自身创建的元素
    if (target.id === 'nodeshot-overlay' || target.id === 'nodeshot-notification') {
      return;
    }

    this.currentTarget = target;
    this.showHighlight(target);
  }

  // 鼠标离开事件
  handleMouseOut(event) {
    if (!this.isActive) return;
    // 不隐藏高亮，保持显示直到鼠标移动到新元素
  }

  // 点击事件
  handleClick(event) {
    if (!this.isActive) return;

    event.preventDefault();
    event.stopPropagation();

    if (this.currentTarget) {
      // 如果元素不可见，先尝试滚动到元素位置
      if (!this.isElementVisible(this.currentTarget)) {
        this.showNotification('正在滚动到目标元素...', 'info');
        this.scrollToElement(this.currentTarget);
        
        // 延迟截图，等待滚动完成
        setTimeout(() => {
          if (this.isActive && this.currentTarget && this.isElementVisible(this.currentTarget)) {
            this.captureElement(this.currentTarget);
          } else {
            this.showNotification('无法定位到目标元素，请手动滚动后重试', 'error');
          }
        }, 600);
      } else {
        this.captureElement(this.currentTarget);
      }
    }
  }

  // 键盘事件
  handleKeyDown(event) {
    if (!this.isActive) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.deactivate();
    }
    // 添加快捷键：按S键自动滚动到当前目标元素
    else if (event.key.toLowerCase() === 's' && this.currentTarget) {
      event.preventDefault();
      this.scrollToElement(this.currentTarget);
      this.showNotification('已滚动到目标元素', 'info');
    }
  }

  // 显示元素高亮
  showHighlight(element) {
    if (!this.isElementVisible(element)) {
      this.hideHighlight();
      this.showNotification('元素不在可视区域内，请滚动页面使其可见', 'info');
      return;
    }

    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // 使用absolute定位，需要加上滚动偏移
    this.overlay.style.display = 'block';
    this.overlay.style.left = (rect.left + scrollX) + 'px';
    this.overlay.style.top = (rect.top + scrollY) + 'px';
    this.overlay.style.width = rect.width + 'px';
    this.overlay.style.height = rect.height + 'px';
  }

  // 隐藏高亮
  hideHighlight() {
    this.overlay.style.display = 'none';
  }

  // 检查元素是否在视口内可见
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // 检查元素是否在视口范围内
    const isInViewport = (
      rect.top < viewportHeight &&
      rect.bottom > 0 &&
      rect.left < viewportWidth &&
      rect.right > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );

    // 检查元素是否被隐藏
    const computedStyle = window.getComputedStyle(element);
    const isVisible = (
      computedStyle.display !== 'none' &&
      computedStyle.visibility !== 'hidden' &&
      computedStyle.opacity !== '0'
    );

    return isInViewport && isVisible;
  }

  // 滚动事件处理
  handleScroll() {
    if (!this.isActive || !this.currentTarget) return;
    
    // 更新高亮位置
    this.showHighlight(this.currentTarget);
  }

  // 窗口大小调整事件处理
  handleResize() {
    if (!this.isActive || !this.currentTarget) return;
    
    // 更新高亮位置
    this.showHighlight(this.currentTarget);
  }

  // 启动DOM变化监听
  startMutationObserver() {
    if (this.mutationObserver) {
      this.stopMutationObserver();
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      if (!this.isActive) return;

      let shouldUpdateHighlight = false;

      mutations.forEach((mutation) => {
        // 检查是否有节点添加或删除
        if (mutation.type === 'childList') {
          shouldUpdateHighlight = true;
        }
        // 检查是否有属性变化（如class、style等）
        else if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target === this.currentTarget || target.contains(this.currentTarget)) {
            shouldUpdateHighlight = true;
          }
        }
      });

      // 延迟更新高亮，避免频繁更新
      if (shouldUpdateHighlight && this.currentTarget) {
        setTimeout(() => {
          if (this.isActive && this.currentTarget) {
            this.showHighlight(this.currentTarget);
          }
        }, 50);
      }
    });

    // 开始观察整个文档的变化
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
  }

  // 停止DOM变化监听
  stopMutationObserver() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  // 自动滚动到元素位置
  scrollToElement(element) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const isInViewport = this.isElementVisible(element);

    if (!isInViewport) {
      // 计算滚动位置，使元素居中显示
      const scrollX = window.pageXOffset + rect.left - window.innerWidth / 2 + rect.width / 2;
      const scrollY = window.pageYOffset + rect.top - window.innerHeight / 2 + rect.height / 2;

      window.scrollTo({
        left: Math.max(0, scrollX),
        top: Math.max(0, scrollY),
        behavior: 'smooth'
      });

      // 滚动完成后更新高亮
      setTimeout(() => {
        if (this.isActive && this.currentTarget === element) {
          this.showHighlight(element);
        }
      }, 500);
    }
  }



  // 截取元素
  async captureElement(element) {
    try {
      // 隐藏插件UI元素，避免被截图包含
      this.hidePluginUI();

      // 等待一小段时间确保UI隐藏完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 显示加载提示
      this.showNotification('正在截图...', 'loading');

      // 获取元素位置信息
      const rect = element.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      const elementInfo = {
        x: rect.left + scrollX,
        y: rect.top + scrollY,
        width: rect.width,
        height: rect.height,
        tagName: element.tagName,
        className: element.className,
        id: element.id
      };

      // 发送截图请求到background script
      chrome.runtime.sendMessage({
        action: 'capture',
        elementInfo: elementInfo
      }, (response) => {
        // 截图完成后恢复UI显示
        this.showPluginUI();

        if (response.success) {
          this.showNotification(`截图成功！文件已保存: ${response.filename}`, 'success');
          this.deactivate();
        } else {
          this.showNotification(`截图失败: ${response.error}`, 'error');
        }
      });

    } catch (error) {
      console.error('截图失败:', error);
      // 出错时也要恢复UI显示
      this.showPluginUI();
      this.showNotification(`截图失败: ${error.message}`, 'error');
    }
  }

  // 裁剪图片
  async cropImage(dataUrl, elementInfo) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 获取设备像素比
        const devicePixelRatio = window.devicePixelRatio || 1;

        // 设置画布尺寸，考虑设备像素比以获得更高清晰度
        canvas.width = elementInfo.width * devicePixelRatio;
        canvas.height = elementInfo.height * devicePixelRatio;

        // 设置画布样式尺寸
        canvas.style.width = elementInfo.width + 'px';
        canvas.style.height = elementInfo.height + 'px';

        // 缩放上下文以匹配设备像素比
        ctx.scale(devicePixelRatio, devicePixelRatio);

        // 启用图像平滑以获得更好的质量
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const img = new Image();
        img.onload = () => {
          try {
            // captureVisibleTab返回的图片已经按设备像素比缩放，所以源坐标和尺寸需要相应调整
            ctx.drawImage(
              img,
              elementInfo.x * devicePixelRatio,
              elementInfo.y * devicePixelRatio,
              elementInfo.width * devicePixelRatio,
              elementInfo.height * devicePixelRatio,
              0,
              0,
              elementInfo.width,
              elementInfo.height
            );

            // 获取用户设置的质量参数
            chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
              let quality = 90; // 默认质量（0-100范围）
              if (response && response.success && response.settings) {
                quality = response.settings.imageQuality || 90;
              }

              // 转换为数据URL，固定使用PNG格式
              const normalizedQuality = quality / 100; // 转换为0-1范围
              const croppedDataUrl = canvas.toDataURL('image/png', normalizedQuality);
              resolve({ success: true, croppedDataUrl });
            });
          } catch (error) {
            reject(new Error(`图片裁剪失败: ${error.message}`));
          }
        };

        img.onerror = () => {
          reject(new Error('图片加载失败'));
        };

        img.src = dataUrl;
      } catch (error) {
        reject(new Error(`裁剪初始化失败: ${error.message}`));
      }
    });
  }

  // 隐藏插件UI元素
  hidePluginUI() {
    // 隐藏高亮覆盖层
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }

    // 隐藏提示框
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }

    // 隐藏现有通知
    const existingNotification = document.getElementById('nodeshot-notification');
    if (existingNotification) {
      existingNotification.style.display = 'none';
    }
  }

  // 显示插件UI元素
  showPluginUI() {
    // 恢复高亮覆盖层显示（如果处于激活状态）
    if (this.isActive && this.overlay) {
      this.overlay.style.display = 'block';
    }

    // 提示框会在鼠标移动时自动显示，这里不需要手动恢复

    // 恢复通知显示
    const existingNotification = document.getElementById('nodeshot-notification');
    if (existingNotification) {
      existingNotification.style.display = 'block';
    }
  }

  // 显示通知
  showNotification(message, type = 'info') {
    // 移除现有通知
    const existingNotification = document.getElementById('nodeshot-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'nodeshot-notification';

    const colors = {
      info: '#4285F4',
      success: '#34A853',
      error: '#EA4335',
      loading: '#FBBC04'
    };

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 1000001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // 自动隐藏通知
    if (type !== 'loading') {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => notification.remove(), 300);
        }
      }, 3000);
    }
  }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// 初始化NodeShot
const nodeShot = new NodeShot();