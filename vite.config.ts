import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/** 规范化基路径：'' → '/'，'mcrcon' → '/mcrcon/' */
const normalizeBase = (value: string | undefined) => {
  const trimmed = (value || '').trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
};

export default defineConfig(() => {
  // 默认部署在根路径；需要子路径时通过环境变量 BASE_PATH 指定，需与 server.js 的 BASE_PATH 一致
  const base = normalizeBase(process.env.BASE_PATH);
  const prefix = base.replace(/\/+$/, '');

  return {
    plugins: [vue()],
    base,
    server: {
      host: '0.0.0.0',
      proxy: {
        [`${prefix}/api`]: {
          target: `http://localhost:${process.env.PORT || 7000}`,
          changeOrigin: true,
        },
        // 自定义背景图由后端从 data/custom 提供，不打包进仓库
        [`${prefix}/assets/custom`]: {
          target: `http://localhost:${process.env.PORT || 7000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
