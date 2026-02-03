import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Loader2, X, Search, 
  Users, UserPlus, Clock, Shield, Eye, EyeOff,
  Calendar, Sparkles, Edit2, Save, RefreshCw, Ban, Check
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AppUser {
  id: string;
  username: string;
  display_name: string | null;
  days_remaining: number;
  expires_at: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

// Simple hash function (for demo - in production use bcrypt on server)
const simpleHash = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "fluxo_salt_2024");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export function AdminUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  
  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [daysValid, setDaysValid] = useState(30);
  const [notes, setNotes] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "expired">("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, username, display_name, days_remaining, expires_at, is_active, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar usuarios");
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setDisplayName("");
    setDaysValid(30);
    setNotes("");
    setShowPassword(false);
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleCreateUser = async () => {
    if (!username || !password) {
      toast.error("Usuario y contraseña son requeridos");
      return;
    }

    if (username.length < 3) {
      toast.error("El usuario debe tener al menos 3 caracteres");
      return;
    }

    if (password.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }

    setSaving(true);
    
    const passwordHash = await simpleHash(password);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    const { data, error } = await supabase
      .from("app_users")
      .insert({
        username: username.toLowerCase().trim(),
        password_hash: passwordHash,
        display_name: displayName || null,
        days_remaining: daysValid,
        expires_at: expiresAt.toISOString(),
        notes: notes || null,
      })
      .select("id, username, display_name, days_remaining, expires_at, is_active, notes, created_at")
      .single();

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("Este nombre de usuario ya existe");
      } else {
        toast.error("Error al crear usuario");
        console.error(error);
      }
    } else {
      setUsers([data, ...users]);
      resetForm();
      toast.success("✨ Usuario creado correctamente");
    }
    setSaving(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setSaving(true);
    
    const updates: Record<string, unknown> = {
      display_name: displayName || null,
      days_remaining: daysValid,
      notes: notes || null,
    };

    // If password is provided, update it
    if (password) {
      updates.password_hash = await simpleHash(password);
    }

    // Recalculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);
    updates.expires_at = expiresAt.toISOString();

    const { error } = await supabase
      .from("app_users")
      .update(updates)
      .eq("id", editingUser.id);

    if (error) {
      toast.error("Error al actualizar usuario");
      console.error(error);
    } else {
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, display_name: displayName || null, days_remaining: daysValid, expires_at: expiresAt.toISOString(), notes: notes || null }
          : u
      ));
      resetForm();
      toast.success("Usuario actualizado");
    }
    setSaving(false);
  };

  const toggleUserActive = async (user: AppUser, is_active: boolean) => {
    const { error } = await supabase
      .from("app_users")
      .update({ is_active })
      .eq("id", user.id);

    if (error) {
      toast.error("Error al cambiar estado");
    } else {
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active } : u));
      toast.success(is_active ? "Usuario activado" : "Usuario desactivado");
    }
  };

  const addDaysToUser = async (user: AppUser, days: number) => {
    const newDays = user.days_remaining + days;
    const newExpires = new Date();
    newExpires.setDate(newExpires.getDate() + newDays);

    const { error } = await supabase
      .from("app_users")
      .update({ 
        days_remaining: newDays,
        expires_at: newExpires.toISOString()
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Error al agregar días");
    } else {
      setUsers(users.map(u => 
        u.id === user.id 
          ? { ...u, days_remaining: newDays, expires_at: newExpires.toISOString() }
          : u
      ));
      toast.success(`+${days} días agregados`);
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;

    const { error } = await supabase
      .from("app_users")
      .delete()
      .eq("id", userToDelete.id);

    if (error) {
      toast.error("Error al eliminar usuario");
    } else {
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success("Usuario eliminado");
    }
    setUserToDelete(null);
    setDeleteDialogOpen(false);
  };

  const openEditDialog = (user: AppUser) => {
    setEditingUser(user);
    setUsername(user.username);
    setDisplayName(user.display_name || "");
    setDaysValid(user.days_remaining);
    setNotes(user.notes || "");
    setPassword("");
    setIsDialogOpen(true);
  };

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const total = users.length;
    const active = users.filter(u => u.is_active && new Date(u.expires_at) > now).length;
    const expired = users.filter(u => new Date(u.expires_at) <= now).length;
    const inactive = users.filter(u => !u.is_active).length;
    return { total, active, expired, inactive };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const now = new Date();
    return users.filter(user => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          user.username.toLowerCase().includes(query) ||
          user.display_name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      if (filterStatus === "active") {
        return user.is_active && new Date(user.expires_at) > now;
      }
      if (filterStatus === "expired") {
        return new Date(user.expires_at) <= now;
      }
      
      return true;
    });
  }, [users, searchQuery, filterStatus]);

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary/30 animate-spin" 
                 style={{ borderTopColor: 'hsl(var(--primary))' }} />
            <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-purple-500/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-wide flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              Gestión de Usuarios
            </h2>
            <p className="text-sm text-white/60 mt-1">
              Crea y administra usuarios con acceso personalizado
            </p>
          </div>

          <Button 
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 shadow-lg shadow-emerald-500/25"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Crear Usuario
          </Button>
        </div>

        {/* Stats Row */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <StatCard label="Total Usuarios" value={stats.total} icon={<Users className="w-4 h-4" />} color="text-white" />
          <StatCard label="Activos" value={stats.active} icon={<Check className="w-4 h-4" />} color="text-emerald-400" />
          <StatCard label="Expirados" value={stats.expired} icon={<Clock className="w-4 h-4" />} color="text-amber-400" />
          <StatCard label="Desactivados" value={stats.inactive} icon={<Ban className="w-4 h-4" />} color="text-red-400" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar usuarios..."
            className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
        
        <div className="flex gap-2">
          <FilterButton active={filterStatus === "all"} onClick={() => setFilterStatus("all")} label="Todos" count={stats.total} />
          <FilterButton active={filterStatus === "active"} onClick={() => setFilterStatus("active")} label="✓ Activos" count={stats.active} />
          <FilterButton active={filterStatus === "expired"} onClick={() => setFilterStatus("expired")} label="⏰ Expirados" count={stats.expired} />
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay usuarios</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const daysLeft = getDaysRemaining(user.expires_at);
            const isExpired = daysLeft <= 0;
            
            return (
              <div
                key={user.id}
                className={`relative overflow-hidden rounded-xl bg-black/40 backdrop-blur-sm border transition-all ${
                  isExpired 
                    ? 'border-red-500/30' 
                    : user.is_active 
                      ? 'border-emerald-500/30' 
                      : 'border-white/10'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                      isExpired
                        ? 'bg-red-500/20 text-red-400'
                        : user.is_active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/10 text-white/40'
                    }`}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate">{user.username}</h3>
                        {user.display_name && (
                          <span className="text-sm text-white/40 truncate">({user.display_name})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        {isExpired ? (
                          <Badge variant="destructive" className="text-xs">
                            Expirado hace {Math.abs(daysLeft)} días
                          </Badge>
                        ) : daysLeft <= 3 ? (
                          <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                            ⚠️ {daysLeft} días restantes
                          </Badge>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysLeft} días
                          </span>
                        )}
                        <span className="text-white/30">•</span>
                        <span className="text-white/40 text-xs">
                          Creado: {new Date(user.created_at).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Quick Add Days */}
                      <div className="hidden sm:flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addDaysToUser(user, 7)}
                          className="h-7 px-2 text-xs hover:bg-white/10"
                        >
                          +7d
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addDaysToUser(user, 30)}
                          className="h-7 px-2 text-xs hover:bg-white/10"
                        >
                          +30d
                        </Button>
                      </div>

                      {/* Toggle Active */}
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={(checked) => toggleUserActive(user, checked)}
                      />

                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(user)}
                        className="hover:bg-white/10"
                      >
                        <Edit2 className="w-4 h-4 text-white/60" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteDialogOpen(true);
                        }}
                        className="hover:bg-red-500/20 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {user.notes && (
                    <p className="mt-3 text-xs text-white/40 bg-white/5 rounded-lg p-2">
                      📝 {user.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsDialogOpen(open);
      }}>
        <DialogContent className="bg-black/90 backdrop-blur-xl border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                {editingUser ? <Edit2 className="w-4 h-4 text-white" /> : <UserPlus className="w-4 h-4 text-white" />}
              </div>
              {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <Label className="text-white/80">Nombre de usuario</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: usuario123"
                disabled={!!editingUser}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-white/80">
                {editingUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? "••••••••" : "Mínimo 4 caracteres"}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-white/10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-white/40" /> : <Eye className="w-4 h-4 text-white/40" />}
                </Button>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label className="text-white/80">Nombre para mostrar (opcional)</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ej: Juan Pérez"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            {/* Days Valid */}
            <div className="space-y-2">
              <Label className="text-white/80">Días de acceso</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={daysValid}
                  onChange={(e) => setDaysValid(parseInt(e.target.value) || 1)}
                  min={1}
                  className="bg-white/5 border-white/10 text-white w-24"
                />
                <div className="flex gap-1">
                  {[7, 15, 30, 90].map(d => (
                    <Button
                      key={d}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDaysValid(d)}
                      className={`h-9 px-3 ${daysValid === d ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10 text-white/60'}`}
                    >
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-white/80">Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas sobre este usuario..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={editingUser ? handleUpdateUser : handleCreateUser}
              disabled={saving}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : editingUser ? (
                <Save className="w-4 h-4 mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {editingUser ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-black/90 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta acción no se puede deshacer. El usuario "{userToDelete?.username}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/10 text-white hover:bg-white/20">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-black/30 border border-white/10 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Filter Button Component
function FilterButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-9 px-3 ${
        active 
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
          : 'hover:bg-white/10 text-white/60 border border-transparent'
      }`}
    >
      {label}
      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-white/10">
        {count}
      </Badge>
    </Button>
  );
}
