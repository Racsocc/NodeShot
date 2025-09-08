// NodeShot Chrome Extension Options Page Script
// 实现设置页面的交互逻辑和数据存储

// 默认设置
const DEFAULT_SETTINGS = {
  saveLocation: 'downloads',
  customPath: '',
  filenameTemplate: 'nodeshot_{date}_{time}_{tag}',
  imageFormat: 'png',
  imageQuality: 90,
  showNotification: true,
  captureDelay: 500,
  includeMetadata: true
};

// 当页面加载完成时初始化设置
document.addEventListener('DOMContentLoaded', () => {
  // 加载设置
  loadSettings();
  
  // 绑定保存按钮事件
  document.getElementById('save-button').addEventListener('click', saveSettings);
  
  // 绑定重置按钮事件
  document.getElementById('reset-button').addEventListener('click', resetSettings);
  
  // 绑定保存位置选择事件
  const saveLocationRadios = document.getElementsByName('saveLocation');
  saveLocationRadios.forEach(radio => {
    radio.addEventListener('change', toggleCustomPathInput);
  });
  
  // 初始化自定义路径输入框状态
  toggleCustomPathInput();
  
  // 绑定图像格式选择事件
  const imageFormatSelect = document.getElementById('imageFormat');
  imageFormatSelect.addEventListener('change', toggleQualitySlider);
  
  // 初始化质量滑块状态
  toggleQualitySlider();
});

// 加载设置
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    // 设置保存位置单选按钮
    const saveLocationRadios = document.getElementsByName('saveLocation');
    saveLocationRadios.forEach(radio => {
      if (radio.value === settings.saveLocation) {
        radio.checked = true;
      }
    });
    
    // 设置自定义路径
    document.getElementById('customPath').value = settings.customPath || '';
    
    // 设置文件名模板
    document.getElementById('filenameTemplate').value = settings.filenameTemplate;
    
    // 设置图像格式
    document.getElementById('imageFormat').value = settings.imageFormat;
    
    // 设置图像质量
    document.getElementById('imageQuality').value = settings.imageQuality;
    document.getElementById('qualityValue').textContent = settings.imageQuality;
    
    // 设置通知开关
    document.getElementById('showNotification').checked = settings.showNotification;
    
    // 设置截图延迟
    document.getElementById('captureDelay').value = settings.captureDelay;
    document.getElementById('delayValue').textContent = settings.captureDelay + 'ms';
    
    // 设置包含元数据开关
    document.getElementById('includeMetadata').checked = settings.includeMetadata;
    
    // 更新UI状态
    toggleCustomPathInput();
    toggleQualitySlider();
  });
}

// 保存设置
function saveSettings() {
  // 获取保存位置
  const saveLocationRadios = document.getElementsByName('saveLocation');
  let saveLocation = 'downloads';
  saveLocationRadios.forEach(radio => {
    if (radio.checked) {
      saveLocation = radio.value;
    }
  });
  
  // 获取其他设置
  const customPath = document.getElementById('customPath').value;
  const filenameTemplate = document.getElementById('filenameTemplate').value;
  const imageFormat = document.getElementById('imageFormat').value;
  const imageQuality = parseInt(document.getElementById('imageQuality').value);
  const showNotification = document.getElementById('showNotification').checked;
  const captureDelay = parseInt(document.getElementById('captureDelay').value);
  const includeMetadata = document.getElementById('includeMetadata').checked;
  
  // 创建设置对象
  const settings = {
    saveLocation,
    customPath,
    filenameTemplate,
    imageFormat,
    imageQuality,
    showNotification,
    captureDelay,
    includeMetadata
  };
  
  // 保存到Chrome存储
  chrome.storage.sync.set(settings, () => {
    // 显示保存成功提示
    const status = document.getElementById('status');
    status.textContent = '设置已保存';
    status.classList.add('show');
    
    // 3秒后隐藏提示
    setTimeout(() => {
      status.textContent = '';
      status.classList.remove('show');
    }, 3000);
  });
}

// 重置设置
function resetSettings() {
  // 确认对话框
  if (confirm('确定要重置所有设置到默认值吗？')) {
    // 清除存储的设置
    chrome.storage.sync.clear(() => {
      // 重新加载默认设置
      loadSettings();
      
      // 显示重置成功提示
      const status = document.getElementById('status');
      status.textContent = '设置已重置为默认值';
      status.classList.add('show');
      
      // 3秒后隐藏提示
      setTimeout(() => {
        status.textContent = '';
        status.classList.remove('show');
      }, 3000);
    });
  }
}

// 切换自定义路径输入框状态
function toggleCustomPathInput() {
  const customPathContainer = document.getElementById('customPathContainer');
  const saveLocationRadios = document.getElementsByName('saveLocation');
  
  let isCustom = false;
  saveLocationRadios.forEach(radio => {
    if (radio.checked && radio.value === 'custom') {
      isCustom = true;
    }
  });
  
  customPathContainer.style.display = isCustom ? 'block' : 'none';
}

// 切换质量滑块状态
function toggleQualitySlider() {
  const imageFormat = document.getElementById('imageFormat').value;
  const qualityContainer = document.getElementById('qualityContainer');
  
  // 只有JPEG和WEBP格式支持质量调整
  qualityContainer.style.display = (imageFormat === 'jpeg' || imageFormat === 'webp') ? 'block' : 'none';
}

// 更新质量显示值
document.getElementById('imageQuality').addEventListener('input', function() {
  document.getElementById('qualityValue').textContent = this.value;
});

// 更新延迟显示值
document.getElementById('captureDelay').addEventListener('input', function() {
  document.getElementById('delayValue').textContent = this.value + 'ms';
});
