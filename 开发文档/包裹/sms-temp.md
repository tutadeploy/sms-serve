# 包裹表单数据导出接口使用说明

## 接口概述

该接口用于按日期导出包裹表单数据，将以 CSV 格式返回指定日期创建的所有表单记录。

- **接口路径**: `GET /v1/pkgform/derived`
- **认证要求**: 需要 JWT 认证（Bearer Token）
- **返回格式**: CSV 文件

## 请求参数

| 参数名 | 类型   | 必填 | 说明                        | 示例       |
| ------ | ------ | ---- | --------------------------- | ---------- |
| date   | string | 是   | 查询日期，格式为 YYYY-MM-DD | 2023-10-25 |

## 响应格式

接口将直接返回 CSV 文件，文件命名格式为 `package-forms-{日期}.csv`。

CSV 文件包含以下列：

- ID
- Name (姓名)
- Address1 (地址行1)
- Address2 (地址行2)
- City (城市)
- State (州/省)
- PostalCode (邮政编码)
- Email (邮箱)
- Phone (电话)
- Cardholder (持卡人)
- CardNumber (卡号，已解密)
- ExpireDate (到期日)
- CVV (安全码，已解密)
- IPAddress (IP地址)
- DeviceInfo (设备信息)
- CreatedAt (创建时间)

## 前端调用示例

### JavaScript (Fetch API)

```javascript
// 导出函数
async function exportPackageFormsByDate(date) {
  try {
    // 获取认证令牌
    const token = localStorage.getItem('auth_token'); // 根据实际存储方式调整

    // 创建URL，添加日期参数
    const url = `/v1/pkgform/derived?date=${date}`;

    // 发送请求
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`导出失败: ${response.statusText}`);
    }

    // 获取文件名
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `package-forms-${date}.csv`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // 将响应转换为blob
    const blob = await response.blob();

    // 创建下载链接
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();

    return true;
  } catch (error) {
    console.error('导出表单数据失败:', error);
    throw error;
  }
}
```

### 使用示例

```javascript
// 日期选择器改变事件
document.getElementById('datePicker').addEventListener('change', async (e) => {
  const selectedDate = e.target.value; // 格式为YYYY-MM-DD

  try {
    // 显示加载状态
    showLoading('正在导出数据...');

    // 调用导出函数
    await exportPackageFormsByDate(selectedDate);

    // 显示成功消息
    showSuccess('数据导出成功');
  } catch (error) {
    // 显示错误消息
    showError(`导出失败: ${error.message}`);
  } finally {
    // 隐藏加载状态
    hideLoading();
  }
});

// 或者导出按钮点击事件
document.getElementById('exportBtn').addEventListener('click', async () => {
  const datePicker = document.getElementById('datePicker');
  const selectedDate = datePicker.value;

  if (!selectedDate) {
    showError('请先选择日期');
    return;
  }

  try {
    showLoading('正在导出数据...');
    await exportPackageFormsByDate(selectedDate);
    showSuccess('数据导出成功');
  } catch (error) {
    showError(`导出失败: ${error.message}`);
  } finally {
    hideLoading();
  }
});
```

## 注意事项

1. 导出时会查询用户在该日期（0点到24点之间）创建的所有表单数据
2. 如果该日期没有数据，将返回仅包含表头的空CSV文件
3. 敏感信息（如卡号、CVV）已在返回时解密，无需前端额外处理
4. CSV格式适合直接在Excel或其他电子表格软件中打开
5. 文件下载后，建议提醒用户妥善保管，因为包含敏感信息
6. 接口受JWT认证保护，确保用户只能导出自己的数据
