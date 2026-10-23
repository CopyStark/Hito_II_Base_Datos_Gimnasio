import React, { useState } from 'react';
import apiClient from '@/services/apiClient';

/**
 * Temporary UI component used to verify that changes made in SSMS are reflected
 * in the live Vercel deployment. It renders a button labeled "mostrar clientes"
 * in the top‑left corner (positioned by the parent layout). When clicked it
 * fetches the list of socios from the backend and displays them in a simple
 * overlay panel.
 *
 * This component is intentionally lightweight and will be removed once the
 * verification process is complete.
 */
export default function ShowClients() {
  const [show, setShow] = useState(false);
  const [clients, setClients] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.socios.getAll();
      setClients(data);
      setShow(true);
    } catch (e: any) {
      setError(e?.message ?? 'Error al obtener los clientes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={fetchClients}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-md transition"
        disabled={loading}
      >
        {loading ? 'Cargando...' : 'mostrar clientes'}
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">
              Lista de clientes
            </h2>
            {error && <p className="text-red-600 mb-2">{error}</p>}
            <ul className="space-y-2">
              {clients.map((c) => (
                <li key={c.id_socio} className="border-b pb-2">
                  <span className="font-medium">{c.nombre_completo}</span> – RUT: {c.rut}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShow(false)}
              className="mt-4 px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
