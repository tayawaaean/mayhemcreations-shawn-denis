import React, { useState, useEffect } from 'react'
import { useAdmin } from '../context/AdminContext'
import { autoReplyService, QuickReplyTemplate } from '../../shared/autoReplyService'
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  GripVertical,
  Settings,
  ToggleLeft,
  ToggleRight,
  Clock
} from 'lucide-react'
import HelpModal from '../components/modals/HelpModal'

const ChatSettings: React.FC = () => {
  const { state, dispatch } = useAdmin()
  const [templates, setTemplates] = useState<QuickReplyTemplate[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<QuickReplyTemplate | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    content: '',
    category: 'General',
    isActive: true
  })
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true)
  const [responseDelay, setResponseDelay] = useState(1000)
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    const settings = autoReplyService.getSettings()
    setTemplates(settings.templates)
    setCategories(autoReplyService.getCategories())
    setAutoReplyEnabled(settings.enabled)
    setResponseDelay(settings.delay)
  }

  const handleSaveTemplate = () => {
    if (isAddingNew) {
      const template = autoReplyService.addTemplate(newTemplate)
      setTemplates([...templates, template])
      setIsAddingNew(false)
      setNewTemplate({ title: '', content: '', category: 'General', isActive: true })
    } else if (editingTemplate) {
      autoReplyService.updateTemplate(editingTemplate.id, editingTemplate)
      setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t))
      setIsEditing(false)
      setEditingTemplate(null)
    }
  }

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      autoReplyService.deleteTemplate(id)
      setTemplates(templates.filter(t => t.id !== id))
    }
  }

  const handleToggleActive = (id: string) => {
    const template = templates.find(t => t.id === id)
    if (template) {
      autoReplyService.updateTemplate(id, { isActive: !template.isActive })
      setTemplates(templates.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t))
    }
  }

  const handleSaveSettings = () => {
    autoReplyService.updateSettings({
      enabled: autoReplyEnabled,
      delay: responseDelay
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Chat Settings</h1>
                <p className="text-sm text-gray-500">Manage quick reply templates for customer chat</p>
              </div>
            </div>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <span className="hidden sm:inline">How to use</span>
              <span className="sm:hidden">?</span>
            </button>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Auto-Reply System</label>
              <p className="text-sm text-gray-500">Enable automatic responses for common questions</p>
            </div>
            <button
              onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoReplyEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  autoReplyEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Response Delay</label>
              <p className="text-sm text-gray-500">Time before showing quick reply options (milliseconds)</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={responseDelay}
                onChange={(e) => setResponseDelay(Number(e.target.value))}
                min="0"
                max="5000"
                step="100"
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-500">ms</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Reply Templates */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Quick Reply Templates</h2>
            <button
              onClick={() => setIsAddingNew(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Template</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{template.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          template.category === 'General' ? 'bg-blue-100 text-blue-800' :
                          template.category === 'Pricing' ? 'bg-green-100 text-green-800' :
                          template.category === 'Shipping' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {template.category}
                        </span>
                        {!template.isActive && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{template.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActive(template.id)}
                      className={`p-1 rounded-md ${
                        template.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {template.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingTemplate(template)
                        setIsEditing(true)
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Template Modal */}
      {(isAddingNew || isEditing) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {isAddingNew ? 'Add New Template' : 'Edit Template'}
              </h2>
              <button
                onClick={() => {
                  setIsAddingNew(false)
                  setIsEditing(false)
                  setEditingTemplate(null)
                  setNewTemplate({ title: '', content: '', category: 'General', isActive: true })
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={isAddingNew ? newTemplate.title : editingTemplate?.title || ''}
                    onChange={(e) => {
                      if (isAddingNew) {
                        setNewTemplate(prev => ({ ...prev, title: e.target.value }))
                      } else if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, title: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Welcome Message"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={isAddingNew ? newTemplate.category : editingTemplate?.category || 'General'}
                    onChange={(e) => {
                      if (isAddingNew) {
                        setNewTemplate(prev => ({ ...prev, category: e.target.value }))
                      } else if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, category: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                    <option value="New Category">+ New Category</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content *
                </label>
                <textarea
                  value={isAddingNew ? newTemplate.content : editingTemplate?.content || ''}
                  onChange={(e) => {
                    if (isAddingNew) {
                      setNewTemplate(prev => ({ ...prev, content: e.target.value }))
                    } else if (editingTemplate) {
                      setEditingTemplate({ ...editingTemplate, content: e.target.value })
                    }
                  }}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter the message content..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isAddingNew ? newTemplate.isActive : editingTemplate?.isActive || false}
                  onChange={(e) => {
                    if (isAddingNew) {
                      setNewTemplate(prev => ({ ...prev, isActive: e.target.checked }))
                    } else if (editingTemplate) {
                      setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active (visible to customers)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsAddingNew(false)
                    setIsEditing(false)
                    setEditingTemplate(null)
                    setNewTemplate({ title: '', content: '', category: 'General', isActive: true })
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={!(isAddingNew ? newTemplate.title && newTemplate.content : editingTemplate?.title && editingTemplate?.content)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingNew ? 'Add Template' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="How to use: Chat Settings">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>Toggle Auto-Reply on to enable automated quick replies.</li>
          <li>Adjust Response Delay to control when options appear.</li>
          <li>Use Add Template to create a new quick reply.</li>
          <li>Edit or Delete templates from the list; toggle Active state.</li>
          <li>Save Settings after changing system-wide options.</li>
        </ol>
      </HelpModal>
    </div>
  )
}

export default ChatSettings
