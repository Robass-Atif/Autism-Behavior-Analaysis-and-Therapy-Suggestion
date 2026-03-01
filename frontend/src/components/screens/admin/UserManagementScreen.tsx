import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  User,
  Heart,
  Mail,
  Calendar,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  X,
  Terminal,
  Activity,
} from "lucide-react";
import UserProfileDetails from "./UserProfileDetails";
import {
  useAdminUsers,
  useSuspendUser,
  useActivateUser,
  useDeleteUser,
  useAdminUserDetails,
  useUpdateUser,
  User as UserType,
} from "../../../api/admin";

interface UserManagementScreenProps {
  onBack?: () => void;
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string }> =
  {
    admin: { label: "ADMIN", icon: Shield, color: "bg-zinc-900 text-white" },
    therapist: {
      label: "THERAPIST",
      icon: User,
      color: "bg-zinc-700 text-white",
    },
    caregiver: {
      label: "CAREGIVER",
      icon: Heart,
      color: "bg-zinc-500 text-white",
    },
    patient: { label: "PATIENT", icon: User, color: "bg-blue-500 text-white" },
  };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: {
    label: "ACTIVE",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  pending: {
    label: "PENDING",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  pending_approval: {
    label: "PENDING APPROVAL",
    color: "bg-amber-100 text-amber-700 border-amber-200 border-dashed",
  },
  pending_verification: {
    label: "PENDING VERIFICATION",
    color: "bg-zinc-100 text-zinc-700 border-zinc-200",
  },
  suspended: {
    label: "SUSPENDED",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  rejected: {
    label: "REJECTED",
    color: "bg-zinc-100 text-zinc-700 border-zinc-200",
  },
};

export default function UserManagementScreen({
  onBack,
}: UserManagementScreenProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    role: "",
  });
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const {
    data: usersData,
    isLoading,
    refetch,
  } = useAdminUsers({
    page,
    limit: 10,
    search: searchQuery,
    role: roleFilter !== "all" ? roleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const suspendMutation = useSuspendUser();
  const activateMutation = useActivateUser();
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();

  const users = usersData?.users || [];
  const totalPages = usersData?.totalPages || 1;

  const handleViewProfile = (user: UserType) => {
    setSelectedUser(user);
    setShowViewModal(true);
    setActionMenuOpen(null);
  };

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const handleDeleteUser = (user: UserType) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const handleSaveEdit = () => {
    if (selectedUser) {
      updateMutation.mutate(
        { id: selectedUser.id, data: editForm },
        {
          onSuccess: () => {
            setShowEditModal(false);
            refetch();
          },
        },
      );
    }
  };

  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(
        { id: selectedUser.id },
        {
          onSuccess: () => {
            setShowDeleteModal(false);
            refetch();
          },
        },
      );
    }
  };

  const handleSuspend = (userId: string) => {
    suspendMutation.mutate(
      { id: userId, reason: "Admin Action" },
      { onSuccess: () => refetch() },
    );
    setActionMenuOpen(null);
  };

  const handleActivate = (userId: string) => {
    activateMutation.mutate(userId, { onSuccess: () => refetch() });
    setActionMenuOpen(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-mono">
      {/* Header */}
      <div className="bg-black text-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 border border-white/20">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">
                User Management
              </h1>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mt-0.5">
                Manage all platform users
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white text-xs uppercase tracking-wider hover:bg-white/20 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Filters */}
        <div className="bg-white border-2 border-zinc-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-zinc-200 bg-zinc-50 text-sm font-mono placeholder-zinc-400 focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2.5 border-2 border-zinc-200 bg-white text-sm font-mono focus:outline-none focus:border-black"
              >
                <option value="all">ALL</option>
                <option value="admin">ADMIN</option>
                <option value="therapist">THERAPIST</option>
                <option value="caregiver">CAREGIVER</option>
                <option value="patient">PATIENT</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 border-2 border-zinc-200 bg-white text-sm font-mono focus:outline-none focus:border-black"
              >
                <option value="all">ALL</option>
                <option value="active">ACTIVE</option>
                <option value="pending">PENDING</option>
                <option value="pending_approval">PENDING APPROVAL</option>
                <option value="pending_verification">
                  PENDING VERIFICATION
                </option>
                <option value="suspended">SUSPENDED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border-2 border-zinc-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-100 text-xs text-zinc-600 uppercase tracking-wider border-b-2 border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Loader2
                      size={24}
                      className="animate-spin mx-auto text-zinc-400"
                    />
                    <p className="text-xs text-zinc-500 mt-2 uppercase">
                      Loading users...
                    </p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-zinc-500 text-sm"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user: UserType) => {
                  const roleConfig =
                    ROLE_CONFIG[user.role] || ROLE_CONFIG.caregiver;
                  const statusConfig =
                    STATUS_CONFIG[user.status] || STATUS_CONFIG.active;
                  const RoleIcon = roleConfig.icon;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-zinc-200 flex items-center justify-center text-zinc-600 font-bold text-sm">
                            {user.fullName?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium text-zinc-900">
                            {user.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-600 font-mono">
                        {user.email}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase ${roleConfig.color}`}
                        >
                          <RoleIcon size={10} />
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-1 text-[10px] font-bold uppercase border ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-500 font-mono">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-right relative">
                        <button
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === user.id ? null : user.id,
                            )
                          }
                          className="p-2 hover:bg-zinc-100 transition-colors"
                        >
                          <MoreVertical size={16} className="text-zinc-500" />
                        </button>

                        {actionMenuOpen === user.id && (
                          <div className="absolute right-4 top-full mt-1 bg-white border-2 border-zinc-200 shadow-lg z-10 min-w-[160px]">
                            <button
                              onClick={() => handleViewProfile(user)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-700 hover:bg-zinc-50 text-left uppercase"
                            >
                              <Eye size={14} />
                              View Profile
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-700 hover:bg-zinc-50 text-left uppercase"
                            >
                              <Edit size={14} />
                              Edit User
                            </button>
                            {user.status === "active" ? (
                              <button
                                onClick={() => handleSuspend(user.id)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-amber-600 hover:bg-amber-50 text-left uppercase"
                              >
                                <UserX size={14} />
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(user.id)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-green-600 hover:bg-green-50 text-left uppercase"
                              >
                                <UserCheck size={14} />
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 text-left uppercase border-t border-zinc-100"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-4 py-3 bg-zinc-50 border-t-2 border-zinc-200 flex items-center justify-between">
            <div className="text-xs text-zinc-500 uppercase">
              Showing {users.length} of {usersData?.total || 0} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border-2 border-zinc-200 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-4 py-2 border-2 border-zinc-200 bg-white text-xs font-bold">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border-2 border-zinc-200 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {/* View User Modal using Detailed Component */}
      {selectedUser && (
        <UserProfileDetails
          userId={selectedUser.id}
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`${selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)} Profile`}
          actions={
            <>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditUser(selectedUser);
                }}
                className="px-4 py-2 border-2 border-zinc-200 text-zinc-700 text-xs uppercase tracking-wider hover:bg-zinc-100 flex items-center gap-2"
              >
                <Edit size={14} /> Edit
              </button>
              {selectedUser.status !== "suspended" ? (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleSuspend(selectedUser.id);
                  }}
                  className="px-4 py-2 border-2 border-amber-200 text-amber-700 text-xs uppercase tracking-wider hover:bg-amber-50 flex items-center gap-2"
                >
                  <UserX size={14} /> Suspend
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleActivate(selectedUser.id);
                  }}
                  className="px-4 py-2 border-2 border-green-200 text-green-700 text-xs uppercase tracking-wider hover:bg-green-50 flex items-center gap-2"
                >
                  <UserCheck size={14} /> Activate
                </button>
              )}
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setActionMenuOpen(null);
                  setSelectedUser(selectedUser);
                  setShowDeleteModal(true);
                }}
                className="px-4 py-2 bg-red-600 text-white text-xs uppercase tracking-wider hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          }
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-zinc-200 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 bg-black text-white">
              <h3 className="font-bold uppercase tracking-wider">Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fullName: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border-2 border-zinc-200 font-mono focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border-2 border-zinc-200 font-mono focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-2">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border-2 border-zinc-200 font-mono focus:outline-none focus:border-black"
                >
                  <option value="admin">ADMIN</option>
                  <option value="therapist">THERAPIST</option>
                  <option value="caregiver">CAREGIVER</option>
                  <option value="patient">PATIENT</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 border-2 border-zinc-200 text-zinc-700 text-xs uppercase tracking-wider hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="flex-1 py-2.5 bg-black text-white text-xs uppercase tracking-wider hover:bg-zinc-800 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-zinc-200 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 bg-red-600 text-white">
              <h3 className="font-bold uppercase tracking-wider">
                Confirm Delete
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 hover:bg-red-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-zinc-700">
                Are you sure you want to delete user{" "}
                <strong>{selectedUser.fullName}</strong>? This action cannot be
                undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 border-2 border-zinc-200 text-zinc-700 text-xs uppercase tracking-wider hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs uppercase tracking-wider hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
