// NodeShot Chrome Extension Popup Script
// 实现弹出页面的交互逻辑

// 当弹出页面加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
  // 绑定截图按钮点击事件
  document.getElementById('capture-button').addEventListener('click', activateCapture);
  
  // 绑定设置按钮点击事件
  document.getElementById('settings-button').addEventListener('click', openSettings);
  
  // 绑定帮助按钮点击事件
  document.getElementById('help-button').addEventListener('click', showHelp);
  
  // 检查当前标签页是否支持截图
  checkCurrentTab();
});

// 激活截图模式
function activateCapture() {
  // 获取当前标签页
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentTab = tabs[0];
    
    // 检查是否是有效的标签页
    if (!currentTab || !currentTab.url) {
      showError('无法在当前页面使用NodeShot');
      return;
    }
    
    // 检查是否是受限制的页面
    if (isRestrictedPage(currentTab.url)) {
      showError('NodeShot无法在浏览器内部页面、扩展页面或应用商店页面使用');
      return;
    }
    
    // 发送激活消息到content script
    chrome.tabs.sendMessage(currentTab.id, {action: 'activate'}, (response) => {
      // 如果发送消息失败，可能是content script未加载
      if (chrome.runtime.lastError) {
        showError('无法连接到页面，请刷新页面后重试');
        return;
      }
      
      // 关闭弹出窗口
      window.close();
    });
  });
}

// 打开设置页面
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// 显示帮助信息
function showHelp() {
  const helpContent = document.getElementById('help-content');
  const captureSection = document.getElementById('capture-section');
  
  // 切换显示
  if (helpContent.style.display === 'block') {
    helpContent.style.display = 'none';
    captureSection.style.display = 'block';
    document.getElementById('help-button').textContent = '帮助';
  } else {
    helpContent.style.display = 'block';
    captureSection.style.display = 'none';
    document.getElementById('help-button').textContent = '返回';
  }
}

// 检查当前标签页是否支持截图
function checkCurrentTab() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentTab = tabs[0];
    
    // 检查是否是有效的标签页
    if (!currentTab || !currentTab.url) {
      disableCaptureButton('无法在当前页面使用NodeShot');
      return;
    }
    
    // 检查是否是受限制的页面
    if (isRestrictedPage(currentTab.url)) {
      disableCaptureButton('NodeShot无法在浏览器内部页面使用');
      return;
    }
  });
}

// 检查是否是受限制的页面
function isRestrictedPage(url) {
  // 检查是否是Chrome内部页面
  if (url.startsWith('chrome://') || 
      url.startsWith('chrome-extension://') || 
      url.startsWith('chrome-search://') || 
      url.startsWith('chrome-devtools://') ||
      url.startsWith('about:') ||
      url.startsWith('edge://') ||
      url.startsWith('brave://') ||
      url.startsWith('opera://') ||
      url.startsWith('vivaldi://') ||
      url.startsWith('file://')) {
    return true;
  }
  
  // 检查是否是Chrome网上应用店
  if (url.includes('chrome.google.com/webstore') ||
      url.includes('microsoftedge.microsoft.com/addons')) {
    return true;
  }
  
  return false;
}

// 禁用截图按钮并显示原因
function disableCaptureButton(reason) {
  const captureButton = document.getElementById('capture-button');
  captureButton.disabled = true;
  captureButton.title = reason;
  
  // 显示警告信息
  const warningElement = document.createElement('div');
  warningElement.className = 'warning';
  warningElement.textContent = reason;
  
  // 插入到按钮后面
  captureButton.parentNode.insertBefore(warningElement, captureButton.nextSibling);
}

// 显示错误信息
function showError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  
  // 3秒后自动隐藏
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 3000);
}