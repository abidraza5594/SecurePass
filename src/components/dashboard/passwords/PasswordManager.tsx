"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Search, Edit, Trash2, Copy, Eye, EyeOff, Loader2, Check, ChevronsUpDown, Tag, X } from 'lucide-react';
import type { Password } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const passwordSchema = z.object({
  appName: z.string().min(1, 'App/Platform name is required'),
  username: z.string().min(1, 'Username/Email is required'),
  password: z.string().min(1, 'Password is required'),
  status: z.enum(['Active', 'Inactive']),
  tags: z.string().optional(),
  customFields: z.array(z.object({
    label: z.string().min(1, "Label is required"),
    value: z.string().min(1, "Value is required"),
  })).optional(),
});

export default function PasswordManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [isFormPasswordVisible, setIsFormPasswordVisible] = useState(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      appName: '',
      username: '',
      password: '',
      status: 'Active',
      tags: '',
      customFields: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customFields",
  });

  useEffect(() => {
    if (user) {
      fetchPasswords();
    }
  }, [user]);

  const fetchPasswords = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const passwordsCollectionRef = collection(db, `users/${user.uid}/passwords`);
      const querySnapshot = await getDocs(passwordsCollectionRef);
      const fetchedPasswords = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Password[];
      setPasswords(fetchedPasswords);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch passwords.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (values: z.infer<typeof passwordSchema>) => {
    if (!user) return;
    const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    const dataToSave = {
        ...values,
        tags: tagsArray,
        customFields: values.customFields || [],
    };

    try {
      if (editingPassword) {
        const passwordDocRef = doc(db, `users/${user.uid}/passwords`, editingPassword.id);
        await updateDoc(passwordDocRef, dataToSave);
        toast({ title: 'Success', description: 'Password updated successfully.' });
      } else {
        await addDoc(collection(db, `users/${user.uid}/passwords`), dataToSave);
        toast({ title: 'Success', description: 'Password added successfully.' });
      }
      fetchPasswords();
      closeDialog();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save password.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/passwords`, id));
      toast({ title: 'Success', description: 'Password deleted.' });
      fetchPasswords();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete password.' });
    }
  };

  const openEditDialog = (password: Password) => {
    setEditingPassword(password);
    form.reset({ ...password, tags: password.tags?.join(', ') || '', customFields: password.customFields || [] });
    setIsFormPasswordVisible(false);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingPassword(null);
    form.reset({ appName: '', username: '', password: '', status: 'Active', tags: '', customFields: [] });
    setIsFormPasswordVisible(false);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingPassword(null);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Password copied to clipboard.' });
  };

  const toggleVisibility = (id: string) => {
    setVisiblePasswords(prev => ({...prev, [id]: !prev[id]}));
  };
  
  const toggleFormPasswordVisibility = () => {
    setIsFormPasswordVisible(prev => !prev);
  };

  const platforms = useMemo(() => {
    const platformSet = new Set(passwords.map(p => p.appName));
    return Array.from(platformSet).sort();
  }, [passwords]);

  const filteredPasswords = useMemo(() => {
    const filtered = passwords.filter(p => {
      const searchMatch = p.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
      const platformMatch = platformFilter === 'all' || p.appName === platformFilter;
      return searchMatch && platformMatch;
    });
    // Reset to page 1 whenever filters change
    setCurrentPage(1);
    return filtered;
  }, [passwords, searchQuery, platformFilter]);

  const totalPages = Math.ceil(filteredPasswords.length / entriesPerPage);

  const paginatedPasswords = useMemo(() => {
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    return filteredPasswords.slice(startIndex, endIndex);
  }, [filteredPasswords, currentPage, entriesPerPage]);

  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password Manager</CardTitle>
        <CardDescription>Securely store and manage your general passwords.</CardDescription>
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by app, username, or tag..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by platform" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {platforms.map(platform => (
                        <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPassword ? 'Edit Password' : 'Add New Password'}</DialogTitle>
                  <DialogDescription>
                    {editingPassword ? 'Update the details for your password.' : 'Enter the details for your new password.'}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="appName"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>App/Platform Name</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                        >
                                            {field.value || "Select or create platform"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                    <Command>
                                        <CommandInput placeholder="Search or create..." onValueChange={field.onChange} />
                                        <CommandList>
                                            <CommandEmpty>
                                                <div className="p-2">No platform found. Type to create.</div>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {platforms.map((platform) => (
                                                    <CommandItem
                                                        value={platform}
                                                        key={platform}
                                                        onSelect={() => {
                                                            form.setValue("appName", platform);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", platform === field.value ? "opacity-100" : "opacity-0")} />
                                                        {platform}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="username" render={({ field }) => (
                      <FormItem><FormLabel>Username/Email</FormLabel><FormControl><Input placeholder="e.g., user@gmail.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input type={isFormPasswordVisible ? "text" : "password"} placeholder="••••••••" {...field} />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" onClick={toggleFormPasswordVisibility}>
                                    {isFormPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tags" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="work, personal, finance" className="pl-8" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                     )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem><FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    
                    <Separator />

                    <div>
                      <FormLabel>Custom Fields</FormLabel>
                      <div className="space-y-4 pt-2">
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex items-end gap-2">
                            <FormField
                              control={form.control}
                              name={`customFields.${index}.label`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel className="text-xs">Label</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Security Question" {...field} />
                                  </FormControl>
                                   <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`customFields.${index}.value`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel className="text-xs">Value</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Your first pet's name?" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => append({ label: "", value: "" })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Field
                      </Button>
                    </div>

                    <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
           </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App/Platform</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    <div className="flex justify-center items-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedPasswords.length > 0 ? (
                paginatedPasswords.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.appName}</TableCell>
                    <TableCell>{p.username}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {visiblePasswords[p.id] ? p.password : '•'.repeat(12)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisibility(p.id)}>
                          {visiblePasswords[p.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(p.password)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {p.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'Active' ? 'default' : 'secondary'} className={p.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/20' : ''}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(p)}><Edit className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the password for {p.appName}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No passwords found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
       <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Show</span>
          <Select value={String(entriesPerPage)} onValueChange={handleEntriesPerPageChange}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
          <span>entries</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="text-muted-foreground">
            Page {totalPages > 0 ? currentPage : 0} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
