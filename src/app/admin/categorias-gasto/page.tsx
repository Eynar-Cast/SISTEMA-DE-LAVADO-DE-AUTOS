import { listarCategoriasGasto } from '@/lib/queries'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { CategoriasGastoManager } from './categorias-gasto-manager'

export default async function CategoriasGastoPage() {
  const categorias = await listarCategoriasGasto()

  return (
    <div>
      <h1 className={tituloPaginaCls}>Categorías de gasto</h1>
      <p className={subtituloCls}>Administra las categorías de gasto del sistema</p>
      <CategoriasGastoManager categorias={categorias} />
    </div>
  )
}