import { createContext, useContext } from 'react'
// 电脑版：中间的列表是用「另一张页面的地址」渲染的（大厅或订单），拿不到真实地址；
// 右边开着哪一单，由外层通过这个 context 告诉列表，用来高亮和切页签
export const OpenTaskCtx = createContext(null)
export const useOpenTaskId = () => useContext(OpenTaskCtx)
