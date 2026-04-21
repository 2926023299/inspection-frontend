import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  createRemoteDirectory,
  deleteRemoteFile,
  downloadRemoteFile,
  listRemoteFiles,
  renameRemoteFile,
  uploadRemoteFiles,
} from '@/api/serverConnections'

export function useRemoteFiles(activeSession, onCwdChange) {
  const fileStates = reactive({})
  const loading = ref(false)
  const uploading = ref(false)
  const error = ref('')

  const activeFileState = computed(() => {
    if (!activeSession.value) {
      return {
        cwd: '',
        parentPath: '',
        breadcrumbs: [],
        entries: [],
      }
    }

    const sessionId = activeSession.value.sessionId
    if (!fileStates[sessionId]) {
      fileStates[sessionId] = {
        cwd: activeSession.value.cwd || '',
        parentPath: '',
        breadcrumbs: [],
        entries: [],
      }
    }
    return fileStates[sessionId]
  })

  async function loadFiles(path) {
    if (!activeSession.value) {
      return
    }

    loading.value = true
    error.value = ''
    try {
      const fileList = await listRemoteFiles(activeSession.value.sessionId, path || activeSession.value.cwd)
      fileStates[activeSession.value.sessionId] = fileList
      onCwdChange(activeSession.value.sessionId, fileList.cwd)
    } catch (requestError) {
      error.value = requestError.message
      ElMessage.error(requestError.message)
    } finally {
      loading.value = false
    }
  }

  async function refreshFiles() {
    if (!activeSession.value) return
    await loadFiles(activeFileState.value.cwd || activeSession.value.cwd)
  }

  async function openPath(path) {
    await loadFiles(path)
  }

  async function goToParent() {
    if (!activeFileState.value.parentPath) return
    await loadFiles(activeFileState.value.parentPath)
  }

  async function createDirectoryAt(path, name) {
    if (!activeSession.value) return
    await createRemoteDirectory(activeSession.value.sessionId, { path, name })
    ElMessage.success('目录已创建')
    await loadFiles(path)
  }

  async function renamePath(fromPath, toPath) {
    if (!activeSession.value) return
    await renameRemoteFile(activeSession.value.sessionId, { fromPath, toPath })
    ElMessage.success('文件已重命名')
    await refreshFiles()
  }

  async function deletePath(path, recursive = false) {
    if (!activeSession.value) return
    await deleteRemoteFile(activeSession.value.sessionId, { path, recursive })
    ElMessage.success(recursive ? '目录已递归删除' : '文件已删除')
    await refreshFiles()
  }

  async function uploadFilesTo(path, files) {
    if (!activeSession.value || !files?.length) return
    uploading.value = true
    try {
      await uploadRemoteFiles(activeSession.value.sessionId, path, files)
      ElMessage.success('文件上传成功')
      await loadFiles(path)
    } catch (requestError) {
      ElMessage.error(requestError.message)
      throw requestError
    } finally {
      uploading.value = false
    }
  }

  async function downloadPath(path, isDirectory = false) {
    if (!activeSession.value) return
    try {
      await downloadRemoteFile(activeSession.value.sessionId, path)
      ElMessage.success(isDirectory ? '目录打包下载已开始' : '文件下载已开始')
    } catch (requestError) {
      ElMessage.error(requestError.message)
    }
  }

  watch(
    activeSession,
    (session) => {
      if (session?.sessionId && !fileStates[session.sessionId]) {
        loadFiles(session.cwd)
      }
    },
    { immediate: true },
  )

  return {
    loading,
    uploading,
    error,
    activeFileState,
    loadFiles,
    refreshFiles,
    openPath,
    goToParent,
    createDirectoryAt,
    renamePath,
    deletePath,
    uploadFilesTo,
    downloadPath,
  }
}
