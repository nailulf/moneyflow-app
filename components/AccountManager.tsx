'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, CreditCard, Search, X, Loader2, Trash2, Edit } from 'lucide-react'
import { AccountDB } from '@/types/database'
import { useAccounts } from '@/contexts/AccountContext'

interface AccountManagerProps {
  userId: string
  onAccountUpdated?: () => void
  className?: string
}

function AccountManagerInternal({ 
  userId,
  onAccountUpdated,
  className = ''
}: AccountManagerProps) {
  const { 
    accounts, 
    loading, 
    error, 
    refreshAccounts, 
    createAccount, 
    updateAccount, 
    deleteAccount 
  } = useAccounts()

  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNewAccountDialogOpen, setIsNewAccountDialogOpen] = useState(false)
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  
  // New account form state
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountType, setNewAccountType] = useState('bank')
  const [newAccountBalance, setNewAccountBalance] = useState('0')
  
  // Edit account form state
  const [editAccountName, setEditAccountName] = useState('')
  const [editAccountType, setEditAccountType] = useState('bank')

  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedAccount = accounts.find(account => account.id === selectedAccountId)

  // Handle creating new account
  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return

    setIsSubmitting(true)
    try {
      const accountData = {
        user_id: userId,
        name: newAccountName.trim(),
        type: newAccountType.toUpperCase() as 'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER',
        balance: parseFloat(newAccountBalance) || 0,
        currency: 'USD',
        is_active: true,
        is_default: false,
        description: null
      }
      
      await createAccount(accountData)
      onAccountUpdated?.()
      
      // Reset form
      setNewAccountName('')
      setNewAccountType('bank')
      setNewAccountBalance('0')
      setIsNewAccountDialogOpen(false)
    } catch (err) {
      console.error('Failed to add account:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle editing account
  const handleEditAccount = async () => {
    if (!selectedAccountId || !editAccountName.trim()) return

    setIsSubmitting(true)
    try {
      await updateAccount(selectedAccountId, {
        name: editAccountName.trim(),
        type: editAccountType.toUpperCase() as 'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER'
      })
      onAccountUpdated?.()
      setIsEditAccountDialogOpen(false)
      setSelectedAccountId(null)
    } catch (err) {
      console.error('Failed to update account:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle deleting account
  const handleDeleteAccount = async () => {
    if (!selectedAccountId) return

    setIsSubmitting(true)
    try {
      await deleteAccount(selectedAccountId)
      onAccountUpdated?.()
      setIsDeleteDialogOpen(false)
      setSelectedAccountId(null)
    } catch (err) {
      console.error('Failed to delete account:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open edit dialog
  const openEditDialog = (account: AccountDB) => {
    setSelectedAccountId(account.id)
    setEditAccountName(account.name)
    setEditAccountType(account.type.toLowerCase())
    setIsEditAccountDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (accountId: string) => {
    setSelectedAccountId(accountId)
    setIsDeleteDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <CreditCard className="h-4 w-4 mr-2" />
          Manage Accounts
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>MANAGE ACCOUNTS</SheetTitle>
          <SheetDescription>
            Create, edit, and organize your bank accounts
          </SheetDescription>
        </SheetHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {loading && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-gray-500">Loading accounts...</p>
            </div>
          </div>
        )}
        
        {!loading && (
          <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Add New Account Button */}
            <Button 
              onClick={() => setIsNewAccountDialogOpen(true)}
              className="w-full"
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Account
            </Button>

            {/* Accounts List */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Your Accounts ({filteredAccounts.length})
              </div>
              
              <div className="space-y-2">
                {filteredAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-gray-900">{account.name}</span>
                          {account.is_default && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className="capitalize">{account.type.toLowerCase().replace('_', ' ')}</span>
                          <span>•</span>
                          <span className={account.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(account.balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(account)}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                        disabled={isSubmitting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!account.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(account.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {filteredAccounts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No accounts found matching your search.' : 'No accounts found. Create your first account!'}
                  </div>
                )}
              </div>
            </div>

            {/* New Account Dialog */}
            <Dialog open={isNewAccountDialogOpen} onOpenChange={setIsNewAccountDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
                  <DialogDescription>
                    Create a new account to track your transactions.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="account-name" className="text-right text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id="account-name"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., Chase Checking"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="account-type" className="text-right text-sm font-medium">
                      Type
                    </label>
                    <select
                      id="account-type"
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value)}
                      className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="bank">Bank</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="cash">Cash</option>
                      <option value="investment">Investment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="account-balance" className="text-right text-sm font-medium">
                      Initial Balance
                    </label>
                    <Input
                      id="account-balance"
                      type="number"
                      step="0.01"
                      value={newAccountBalance}
                      onChange={(e) => setNewAccountBalance(e.target.value)}
                      placeholder="0.00"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsNewAccountDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddAccount}
                    disabled={!newAccountName.trim() || isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Account Dialog */}
            <Dialog open={isEditAccountDialogOpen} onOpenChange={setIsEditAccountDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Account</DialogTitle>
                  <DialogDescription>
                    Update account information.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="edit-account-name" className="text-right text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id="edit-account-name"
                      value={editAccountName}
                      onChange={(e) => setEditAccountName(e.target.value)}
                      placeholder="Account name"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="edit-account-type" className="text-right text-sm font-medium">
                      Type
                    </label>
                    <select
                      id="edit-account-type"
                      value={editAccountType}
                      onChange={(e) => setEditAccountType(e.target.value)}
                      className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="bank">Bank</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="cash">Cash</option>
                      <option value="investment">Investment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditAccountDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditAccount}
                    disabled={!editAccountName.trim() || isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{selectedAccount?.name}"? This action cannot be undone.
                    {selectedAccount?.is_default && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                        This is your default account and cannot be deleted.
                      </div>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isSubmitting || selectedAccount?.is_default}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// Wrapper component that handles client-side mounting
export function AccountManager(props: AccountManagerProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return <AccountManagerInternal {...props} />
}