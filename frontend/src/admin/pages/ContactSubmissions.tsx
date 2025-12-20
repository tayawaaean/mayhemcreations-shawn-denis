import React, { useState, useEffect } from 'react'
import { 
  Mail, 
  Search, 
  Filter, 
  Eye, 
  Archive, 
  CheckCircle, 
  Clock, 
  Trash2,
  RefreshCw,
  Phone,
  Building,
  Package,
  MessageSquare,
  Calendar,
  Reply
} from 'lucide-react'
import { contactApiService, Contact } from '../../shared/contactApiService'
import { useAlertModal } from '../../ecommerce/context/AlertModalContext'
import { openEmailReply, createReplyBody, generateReplySubject } from '../../shared/emailUtils'

const ContactSubmissions: React.FC = () => {
  const { showSuccess, showError } = useAlertModal()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadContacts()
  }, [statusFilter])

  useEffect(() => {
    filterContacts()
  }, [contacts, searchQuery, statusFilter])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 100 }
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      const response = await contactApiService.getContacts(params)
      if (response.success && response.data) {
        setContacts(response.data.contacts)
        setTotal(response.data.total)
      } else {
        showError(response.message || 'Failed to load contact submissions', 'Error')
      }
    } catch (error: any) {
      console.error('Error loading contacts:', error)
      showError('Failed to load contact submissions', 'Error')
    } finally {
      setLoading(false)
    }
  }

  const filterContacts = () => {
    let filtered = [...contacts]

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.message.toLowerCase().includes(query) ||
        c.projectType.toLowerCase().includes(query) ||
        (c.company && c.company.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query))
      )
    }

    setFilteredContacts(filtered)
  }

  const handleStatusUpdate = async (id: number, status: Contact['status']) => {
    try {
      const response = await contactApiService.updateContactStatus(id, status)
      if (response.success) {
        showSuccess('Contact status updated successfully', 'Success')
        loadContacts()
        if (selectedContact?.id === id) {
          setSelectedContact(response.data || null)
        }
      } else {
        showError(response.message || 'Failed to update status', 'Error')
      }
    } catch (error: any) {
      console.error('Error updating contact status:', error)
      showError('Failed to update contact status', 'Error')
    }
  }

  const handleReply = (contact: Contact) => {
    try {
      const subject = generateReplySubject(`Contact form submission from ${contact.name}`)
      const submissionDate = new Date(contact.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      // Create a more detailed reply body with submission context
      let replyBody = `Hello ${contact.name},\n\n`
      replyBody += `Thank you for contacting Mayhem Creations regarding your inquiry about ${contact.projectType}.\n\n`
      replyBody += `[Please type your reply above this line]\n\n`
      replyBody += `---\n`
      replyBody += `Original message received on ${submissionDate}:\n\n`
      if (contact.company) {
        replyBody += `Company: ${contact.company}\n`
      }
      if (contact.phone) {
        replyBody += `Phone: ${contact.phone}\n`
      }
      if (contact.quantity) {
        replyBody += `Quantity: ${contact.quantity}\n`
      }
      replyBody += `Project Type: ${contact.projectType}\n\n`
      replyBody += `Message:\n${contact.message.split('\n').map(line => `> ${line}`).join('\n')}`
      
      openEmailReply({
        to: contact.email,
        subject: subject,
        body: replyBody
      })
      
      // Mark as responded when replying
      if (contact.status !== 'responded') {
        handleStatusUpdate(contact.id, 'responded')
      }
      
      showSuccess('Opening email client to reply...', 'Reply')
    } catch (error: any) {
      console.error('Error opening email client:', error)
      showError('Failed to open email client. Please ensure Outlook or your default email client is configured.', 'Error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this contact submission?')) {
      return
    }

    try {
      const response = await contactApiService.deleteContact(id)
      if (response.success) {
        showSuccess('Contact submission deleted successfully', 'Success')
        loadContacts()
        if (selectedContact?.id === id) {
          setSelectedContact(null)
        }
      } else {
        showError(response.message || 'Failed to delete contact', 'Error')
      }
    } catch (error: any) {
      console.error('Error deleting contact:', error)
      showError('Failed to delete contact submission', 'Error')
    }
  }

  const getStatusBadge = (status: Contact['status']) => {
    const badges = {
      new: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock, label: 'New' },
      read: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Eye, label: 'Read' },
      responded: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Responded' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Archive, label: 'Archived' }
    }
    const badge = badges[status]
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <Mail className="w-6 h-6 mr-2 text-accent" />
          Contact Submissions
        </h1>
        <p className="text-gray-600">View and manage customer contact form submissions</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, message, or project type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="responded">Responded</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadContacts}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Total:</span>
            <span className="font-semibold text-gray-900">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">New:</span>
            <span className="font-semibold text-blue-600">{contacts.filter(c => c.status === 'new').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Showing:</span>
            <span className="font-semibold text-gray-900">{filteredContacts.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading contact submissions...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-2">No contact submissions found</p>
                <p className="text-sm text-gray-500">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'No submissions yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      selectedContact?.id === contact.id ? 'bg-accent/5 border-l-4 border-accent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedContact(contact)}
                      >
                        <h3 className="font-semibold text-gray-900 truncate">{contact.name}</h3>
                        <p className="text-sm text-gray-600 truncate">{contact.email}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        {getStatusBadge(contact.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        <span className="capitalize">{contact.projectType}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(contact.createdAt)}</span>
                      </div>
                    </div>
                    {contact.message && (
                      <p 
                        className="text-sm text-gray-600 mt-2 line-clamp-2 cursor-pointer"
                        onClick={() => setSelectedContact(contact)}
                      >
                        {contact.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReply(contact)
                        }}
                        className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors flex items-center gap-2 text-xs font-medium"
                        title="Reply via email (opens Outlook or default email client)"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        Reply
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedContact(contact)
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contact Details Sidebar */}
        <div className="lg:col-span-1">
          {selectedContact ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Contact Details</h2>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Status</label>
                  <div className="mb-2">{getStatusBadge(selectedContact.status)}</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.status !== 'new' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedContact.id, 'new')}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Mark New
                      </button>
                    )}
                    {selectedContact.status !== 'read' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedContact.id, 'read')}
                        className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      >
                        Mark Read
                      </button>
                    )}
                    {selectedContact.status !== 'responded' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedContact.id, 'responded')}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Mark Responded
                      </button>
                    )}
                    {selectedContact.status !== 'archived' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedContact.id, 'archived')}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Contact Information</label>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{selectedContact.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        <a href={`mailto:${selectedContact.email}`} className="hover:text-accent">
                          {selectedContact.email}
                        </a>
                      </div>
                    </div>
                    {selectedContact.phone && (
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <a href={`tel:${selectedContact.phone}`} className="hover:text-accent">
                          {selectedContact.phone}
                        </a>
                      </div>
                    )}
                    {selectedContact.company && (
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {selectedContact.company}
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Details */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Project Details</label>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Project Type:</span>
                      <div className="text-sm font-medium text-gray-900 capitalize">{selectedContact.projectType}</div>
                    </div>
                    {selectedContact.quantity && (
                      <div>
                        <span className="text-xs text-gray-500">Quantity:</span>
                        <div className="text-sm font-medium text-gray-900">{selectedContact.quantity}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Message
                  </label>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedContact.message}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Submitted: {formatDate(selectedContact.createdAt)}</div>
                    {selectedContact.updatedAt !== selectedContact.createdAt && (
                      <div>Updated: {formatDate(selectedContact.updatedAt)}</div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <button
                    onClick={() => handleReply(selectedContact)}
                    className="w-full px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    title="Opens Outlook or your default email client with a pre-filled reply"
                  >
                    <Reply className="w-4 h-4" />
                    Reply via Email (Open Outlook)
                  </button>
                  <button
                    onClick={() => handleDelete(selectedContact.id)}
                    className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Submission
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-sm">Select a contact submission to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContactSubmissions

