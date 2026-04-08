import DashboardStats from './DashboardStats';
import UserManagement from './UserManagement';
import AuditLogs from './AuditLogs';

// Este será el componente que App.jsx verá como "PanelGerente"
// En index.jsx
export default function PanelGerente() {
  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
      {/* Sección 1: Números rápidos */}
      <section>
        <DashboardStats />
      </section>

      {/* Sección 2: Control de personal (El plato fuerte) */}
      <section>
        <UserManagement />
      </section>

      {/* Sección 3: Actividad (Para el ojo del dueño) */}
      <section>
        <AuditLogs />
      </section>
    </div>
  );
}