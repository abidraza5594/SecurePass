"use client";

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Search, Edit, Trash2, Copy, Eye, EyeOff, Loader2, Tag, X } from 'lucide-react';
import type { ApiKey } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const apiKeySchema = z.object({
  modelName: z.string().min(1, 'Model name is required'),
  apiKey: z.string().min(1, 'API Key is required'),
  status: z.enum(['Active', 'Inactive']),
  tags: z.string().optional(),
  customFields: z.array(z.object({
    label: z.string().min(1, "Label is required"),
    value: z.string().min(1, "Value is required"),
  })).optional(),
});

export default function ApiKeyManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const form = useForm<z.infer<typeof apiKeySchema>>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      modelName: '',
      apiKey: '',
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
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const keysCollectionRef = collection(db, `users/${user.uid}/apiKeys`);
      const querySnapshot = await getDocs(keysCollectionRef);
      const keys = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ApiKey[];
      setApiKeys(keys);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch API keys.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (values: z.infer<typeof apiKeySchema>) => {
    if (!user) return;
    const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    const dataToSave = {
        ...values,
        tags: tagsArray,
        customFields: values.customFields || [],
    };
    try {
      if (editingKey) {
        const keyDocRef = doc(db, `users/${user.uid}/apiKeys`, editingKey.id);
        await updateDoc(keyDocRef, dataToSave);
        toast({ title: 'Success', description: 'API Key updated successfully.' });
      } else {
        await addDoc(collection(db, `users/${user.uid}/apiKeys`), dataToSave);
        toast({ title: 'Success', description: 'API Key added successfully.' });
      }
      fetchApiKeys();
      closeDialog();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save API key.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/apiKeys`, id));
      toast({ title: 'Success', description: 'API Key deleted.' });
      fetchApiKeys();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete API key.' });
    }
  };

  const openEditDialog = (key: ApiKey) => {
    setEditingKey(key);
    form.reset({ ...key, tags: key.tags?.join(', ') || '', customFields: key.customFields || [] });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingKey(null);
    form.reset({ modelName: '', apiKey: '', status: 'Active', tags: '', customFields: [] });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingKey(null);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'API Key copied to clipboard.' });
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => ({...prev, [id]: !prev[id]}));
  };

  const filteredKeys = useMemo(() => 
    apiKeys.filter(key => 
      key.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (key.tags && key.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    ), [apiKeys, searchQuery]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key Manager</CardTitle>
        <CardDescription>Securely store and manage your AI model API keys.</CardDescription>
        <div className="flex items-center gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by model name or tag..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingKey ? 'Edit API Key' : 'Add New API Key'}</DialogTitle>
                <DialogDescription>
                  {editingKey ? 'Update the details for your API key.' : 'Enter the details for your new API key.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="modelName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Model Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Google Gemini" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your API key" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                                    <Input placeholder="e.g., Usage Limit" {...field} />
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
                                    <Input placeholder="e.g., 1000 requests/day" {...field} />
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
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model Name</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <div className="flex justify-center items-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredKeys.length > 0 ? (
                filteredKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.modelName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {visibleKeys[key.id] ? key.apiKey : '•'.repeat(12)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisibility(key.id)}>
                          {visibleKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(key.apiKey)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {key.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.status === 'Active' ? 'default' : 'secondary'} className={key.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/20' : ''}>{key.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(key)}><Edit className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the API key for {key.modelName}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(key.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No API keys found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
