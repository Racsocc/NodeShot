// NodeShot Chrome Extension Background Script
// 处理截图生成和文件下载逻辑

// 默认设置
const DEFAULT_SETTINGS = {
  fileNamePrefix: 'NodeShot',
  filenameTemplate: 'screenshot_{timestamp}',
  imageQuality: 90
};

// 初始化设置
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['nodeshot_settings'], (result) => {
    if (!result.nodeshot_settings) {
      chrome.storage.sync.set({ nodeshot_settings: DEFAULT_SETTINGS });
    }
  });
  
  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'nodeshot-options',
    title: '选项',
    contexts: ['action']
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'nodeshot-options') {
    chrome.runtime.openOptionsPage();
  }
});

// 处理插件图标点击事件 - 直接激活截图模式
chrome.action.onClicked.addListener((tab) => {
  // 向当前标签页发送激活截图模式的消息
  chrome.tabs.sendMessage(tab.id, { action: 'activate' });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'activate':
      handleActivate(sender.tab.id);
      sendResponse({ success: true });
      break;
      
    case 'deactivate':
      handleDeactivate(sender.tab.id);
      sendResponse({ success: true });
      break;
      
    case 'capture':
      handleCapture(request.elementInfo, sender.tab.id)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // 保持消息通道开放
      
    case 'getSettings':
      getSettings()
        .then(settings => sendResponse({ success: true, settings }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// 激活截图模式
function handleActivate(tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'activate' });
}

// 停用截图模式
function handleDeactivate(tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'deactivate' });
}

// 处理截图请求
async function handleCapture(elementInfo, tabId) {
  try {
    // 获取用户设置
    const settings = await getSettings();
    
    // 图片质量参数（已经是0-100范围的整数）
    const quality = settings.imageQuality || 90;
    
    // 截取整个可见区域（固定使用PNG格式）
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: quality
    });
    
    // 将截图数据发送给content script进行裁剪
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'cropImage',
      dataUrl: dataUrl,
      elementInfo: elementInfo
    });
    
    if (!response.success) {
      throw new Error(response.error);
    }
    
    // 生成文件名
    const filename = generateFilename(elementInfo, settings);
    
    // 简化的下载路径逻辑 - 直接下载到默认下载文件夹
    let downloadPath = '';
    
    // 下载文件
    const downloadId = await chrome.downloads.download({
      url: response.croppedDataUrl,
      filename: downloadPath ? `${downloadPath}/${filename}` : filename,
      saveAs: false
    });
    
    // 记录截图历史
    await saveHistory({
      timestamp: new Date().toISOString(),
      filename: filename,
      elementInfo: elementInfo,
      downloadId: downloadId
    });
    
    return { success: true, filename: filename };
    
  } catch (error) {
    console.error('截图失败:', error);
    return { success: false, error: error.message };
  }
}

// 裁剪功能已移至content script中执行

// 生成文件名
function generateFilename(elementInfo, settings) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const elementId = (elementInfo && (elementInfo.id || elementInfo.className || elementInfo.tagName)) || 'element';
  
  // 修复：使用正确的属性名 filenameTemplate，并添加空值检查
  const template = settings.filenameTemplate || 'screenshot_{timestamp}';
  
  let filename = template
    .replace('{timestamp}', timestamp)
    .replace('{elementId}', elementId)
    .replace(/[^a-zA-Z0-9\-_]/g, '_');
  
  // 添加文件名前缀
  if (settings.fileNamePrefix) {
    filename = settings.fileNamePrefix + '_' + filename;
  }
    
  return `${filename}.png`;
}

// 获取设置
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['nodeshot_settings'], (result) => {
      resolve(result.nodeshot_settings || DEFAULT_SETTINGS);
    });
  });
}

// 保存截图历史
function saveHistory(record) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['capture_history'], (result) => {
      const history = result.capture_history || [];
      history.unshift(record); // 添加到开头
      
      // 只保留最近100条记录
      if (history.length > 100) {
        history.splice(100);
      }
      
      chrome.storage.local.set({ capture_history: history }, resolve);
    });
  });
}

// 监听下载完成事件
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    // 可以在这里添加下载完成的通知逻辑
    console.log('截图下载完成:', downloadDelta.id);
  }
});