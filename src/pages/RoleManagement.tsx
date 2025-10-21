import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PlusCircle, Edit, Trash2, Shield, Users, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import type { Role, Permission } from "@/types/user";
import { getApiBaseUrl } from "@/utils/platformConfig";

const API_BASE_URL = getApiBaseUrl();

const RoleManagement = () => {
  const { users } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isDeleteRoleOpen, setIsDeleteRoleOpen] = useState(false);
  const [isManagePermissionsOpen, setIsManagePermissionsOpen] = useState(false);
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
  const [isDeletePermissionOpen, setIsDeletePermissionOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissionModule, setPermissionModule] = useState("");
  const [permissionAction, setPermissionAction] = useState("");
  const [permissionDescription, setPermissionDescription] = useState("");

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      logger.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles/permissions/all`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      }
    } catch (error) {
      logger.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRolePermissions(data.permissions || []);
      }
    } catch (error) {
      logger.error('Error fetching role permissions:', error);
      toast.error('Failed to load role permissions');
    }
  };

  const handleAddRole = async () => {
    if (!roleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: roleName,
          description: roleDescription,
        }),
      });

      if (response.ok) {
        toast.success('Role created successfully');
        fetchRoles();
        setIsAddRoleOpen(false);
        setRoleName("");
        setRoleDescription("");
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create role');
      }
    } catch (error) {
      logger.error('Error creating role:', error);
      toast.error('Failed to create role');
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole || !roleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: roleName,
          description: roleDescription,
        }),
      });

      if (response.ok) {
        toast.success('Role updated successfully');
        fetchRoles();
        setIsEditRoleOpen(false);
        setSelectedRole(null);
        setRoleName("");
        setRoleDescription("");
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update role');
      }
    } catch (error) {
      logger.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch(`${API_BASE_URL}/roles/${selectedRole.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Role deleted successfully');
        fetchRoles();
        setIsDeleteRoleOpen(false);
        setSelectedRole(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete role');
      }
    } catch (error) {
      logger.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  const handleAddPermission = async () => {
    if (!permissionModule.trim() || !permissionAction.trim()) {
      toast.error('Module and action are required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/roles/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          module: permissionModule,
          action: permissionAction,
          description: permissionDescription,
        }),
      });

      if (response.ok) {
        toast.success('Permission created successfully');
        fetchPermissions();
        setIsAddPermissionOpen(false);
        setPermissionModule("");
        setPermissionAction("");
        setPermissionDescription("");
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create permission');
      }
    } catch (error) {
      logger.error('Error creating permission:', error);
      toast.error('Failed to create permission');
    }
  };

  const handleDeletePermission = async () => {
    if (!selectedPermission) return;

    try {
      const response = await fetch(`${API_BASE_URL}/roles/permissions/${selectedPermission.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Permission deleted successfully');
        fetchPermissions();
        setIsDeletePermissionOpen(false);
        setSelectedPermission(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete permission');
      }
    } catch (error) {
      logger.error('Error deleting permission:', error);
      toast.error('Failed to delete permission');
    }
  };

  const handleTogglePermission = async (permissionId: string, isAssigned: boolean) => {
    if (!selectedRole) return;

    try {
      const url = `${API_BASE_URL}/roles/${selectedRole.id}/permissions/${permissionId}`;
      const method = isAssigned ? 'DELETE' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
      });

      if (response.ok) {
        toast.success(isAssigned ? 'Permission removed' : 'Permission assigned');
        fetchRolePermissions(selectedRole.id);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update permission');
      }
    } catch (error) {
      logger.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const openManagePermissions = (role: Role) => {
    setSelectedRole(role);
    fetchRolePermissions(role.id);
    setIsManagePermissionsOpen(true);
  };

  const openEditRole = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setIsEditRoleOpen(true);
  };

  const openDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteRoleOpen(true);
  };

  const openDeletePermission = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsDeletePermissionOpen(true);
  };

  const getUsersWithRole = (roleName: string) => {
    return users.filter(user => user.role === roleName.toLowerCase());
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPermissions = permissions.filter(permission =>
    permission.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">
            Manage roles and permissions for your organization
          </p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>Manage user roles and their permissions</CardDescription>
              </div>
              <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Role</DialogTitle>
                    <DialogDescription>Create a new role for your organization</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleName">Role Name</Label>
                      <Input
                        id="roleName"
                        placeholder="e.g., Supervisor"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roleDescription">Description</Label>
                      <Textarea
                        id="roleDescription"
                        placeholder="Describe the role's purpose..."
                        value={roleDescription}
                        onChange={(e) => setRoleDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRole}>Create Role</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search roles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoles.length > 0 ? (
                        filteredRoles.map((role) => {
                          const usersWithRole = getUsersWithRole(role.name);
                          return (
                            <TableRow key={role.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-muted-foreground" />
                                  {role.name}
                                </div>
                              </TableCell>
                              <TableCell>{role.description || "-"}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant="secondary">{usersWithRole.length}</Badge>
                                  {usersWithRole.length > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                      ({usersWithRole.map(u => u.email).join(', ')})
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openManagePermissions(role)}
                                  >
                                    <Shield className="h-4 w-4 mr-1" />
                                    Permissions
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditRole(role)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openDeleteRole(role)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "No roles match the search criteria" : "No roles found"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>Manage available permissions in the system</CardDescription>
              </div>
              <Dialog open={isAddPermissionOpen} onOpenChange={setIsAddPermissionOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Permission
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Permission</DialogTitle>
                    <DialogDescription>Create a new permission for roles</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="permissionModule">Module</Label>
                      <Input
                        id="permissionModule"
                        placeholder="e.g., sales, inventory, users"
                        value={permissionModule}
                        onChange={(e) => setPermissionModule(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="permissionAction">Action</Label>
                      <Input
                        id="permissionAction"
                        placeholder="e.g., create, read, update, delete"
                        value={permissionAction}
                        onChange={(e) => setPermissionAction(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="permissionDescription">Description</Label>
                      <Textarea
                        id="permissionDescription"
                        placeholder="Describe what this permission allows..."
                        value={permissionDescription}
                        onChange={(e) => setPermissionDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddPermissionOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPermission}>Create Permission</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPermissions.length > 0 ? (
                        filteredPermissions.map((permission) => (
                          <TableRow key={permission.id}>
                            <TableCell>
                              <Badge>{permission.module}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{permission.action}</Badge>
                            </TableCell>
                            <TableCell>{permission.description || "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeletePermission(permission)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {searchTerm ? "No permissions match the search criteria" : "No permissions found"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editRoleName">Role Name</Label>
              <Input
                id="editRoleName"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRoleDescription">Description</Label>
              <Textarea
                id="editRoleDescription"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRole}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteRoleOpen} onOpenChange={setIsDeleteRoleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{selectedRole?.name}"?
              {selectedRole && getUsersWithRole(selectedRole.name).length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This role is currently assigned to {getUsersWithRole(selectedRole.name).length} user(s).
                  You cannot delete a role that is in use.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeletePermissionOpen} onOpenChange={setIsDeletePermissionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the permission "{selectedPermission?.module} - {selectedPermission?.action}"?
              This will remove it from all roles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePermission}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isManagePermissionsOpen} onOpenChange={setIsManagePermissionsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Permissions for {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Assign or remove permissions for this role
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => {
                  const isAssigned = rolePermissions.some(rp => rp.id === permission.id);
                  return (
                    <TableRow key={permission.id}>
                      <TableCell>
                        <Checkbox
                          checked={isAssigned}
                          onCheckedChange={() => handleTogglePermission(permission.id, isAssigned)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge>{permission.module}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{permission.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {permission.description || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsManagePermissionsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;
