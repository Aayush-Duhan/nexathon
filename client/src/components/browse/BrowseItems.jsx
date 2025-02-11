import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../dashboard/DashboardLayout';
import { itemsAPI } from '../../services/api';
import { processImage } from '../../utils/imageUtils';
import BookingModal from '../items/BookingModal';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Filter options (similar to MyItems)
const FILTER_OPTIONS = {
  STATUS: [
    { value: 'all', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'borrowed', label: 'Borrowed' }
  ],
  CATEGORY: [
    { value: 'all', label: 'All Categories' },
    { value: 'tools', label: 'Tools' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'sports', label: 'Sports' },
    { value: 'camping', label: 'Camping' },
    { value: 'party', label: 'Party' }
  ],
  SORT: [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'price-low', label: 'Price: Low to High' }
  ]
};

export default function BrowseItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processedImages, setProcessedImages] = useState({});
  const [loadedImages, setLoadedImages] = useState({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // View type state
  const [viewType, setViewType] = useState('grid');

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle image load
  const handleImageLoad = (imageUrl) => {
    setLoadedImages(prev => ({ ...prev, [imageUrl]: true }));
  };

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await itemsAPI.getAllItems();
        setItems(response.data);
      } catch (err) {
        setError('Failed to fetch items');
        console.error('Error fetching items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Process images
  useEffect(() => {
    const processImages = async () => {
      const processed = {};
      for (const item of items) {
        if (item.images[0] && !processedImages[item.images[0]]) {
          processed[item.images[0]] = await processImage(item.images[0]);
        }
      }
      setProcessedImages(prev => ({ ...prev, ...processed }));
    };

    if (items.length > 0) {
      processImages();
    }
  }, [items]);

  // Filter and sort items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'price-high':
        return b.price - a.price;
      case 'price-low':
        return a.price - b.price;
      default: // newest
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSortBy('newest');
  };

  const handleEnquire = async (item) => {
    try {
      const response = await api.post('/api/conversations', {
        itemId: item._id,
        ownerId: item.owner._id,
        initialMessage: `Hi, I'm interested in borrowing your ${item.name}.`
      });
      
      navigate('/messages', { 
        state: { conversationId: response.data._id }
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Browse Items</h1>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="bg-dark-800/30 backdrop-blur-xl rounded-lg border border-dark-700/50 p-1">
              <button
                onClick={() => setViewType('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewType === 'grid'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewType('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewType === 'table'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-12 gap-4">
          {/* Search */}
          <div className="col-span-12 lg:col-span-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full px-4 py-2 bg-dark-800/30 backdrop-blur-xl rounded-lg border border-dark-700/50 text-white placeholder-dark-400 focus:outline-none focus:border-primary-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-10 top-2.5 text-dark-400 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <svg className="absolute right-3 top-2.5 h-5 w-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters */}
          <div className="col-span-12 lg:col-span-7">
            <div className="flex flex-wrap gap-4">
              {/* Status Filter */}
              <div className="relative flex-1 min-w-[140px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-dark-800 border border-dark-700/50 text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                >
                  {FILTER_OPTIONS.STATUS.map(option => (
                    <option key={option.value} value={option.value} className="bg-dark-800 text-white">{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="relative flex-1 min-w-[140px]">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-dark-800 border border-dark-700/50 text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                >
                  {FILTER_OPTIONS.CATEGORY.map(option => (
                    <option key={option.value} value={option.value} className="bg-dark-800 text-white">{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="relative flex-1 min-w-[140px]">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-dark-800 border border-dark-700/50 text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                >
                  {FILTER_OPTIONS.SORT.map(option => (
                    <option key={option.value} value={option.value} className="bg-dark-800 text-white">{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="col-span-12 lg:col-span-1 flex items-start">
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-dark-400 hover:text-white transition-colors rounded-lg border border-dark-700/50 hover:border-primary-500/50"
              title="Clear all filters"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Items Display */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="text-dark-400 animate-pulse">Loading items...</div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="text-4xl">😕</div>
              <div className="text-red-400">{error}</div>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 text-sm bg-dark-800/50 hover:bg-dark-700/50 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="text-4xl">🔍</div>
              <div className="text-dark-400">No items found</div>
              <button 
                onClick={clearFilters} 
                className="px-4 py-2 text-sm bg-dark-800/50 hover:bg-dark-700/50 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : viewType === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => (
              <div
                key={item._id}
                className="group bg-dark-800/30 backdrop-blur-xl rounded-xl border border-dark-700/50 overflow-hidden hover:border-primary-500/20 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-48 w-full overflow-hidden bg-dark-900">
                  {item.images?.[0] ? (
                    <>
                      {!loadedImages[item.images[0]] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-dark-900">
                          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      <img
                        src={processedImages[item.images[0]] || item.images[0]}
                        alt={item.name}
                        className={`h-full w-full object-cover ${
                          loadedImages[item.images[0]] ? 'opacity-100' : 'opacity-0'
                        }`}
                        loading="lazy"
                        onLoad={() => handleImageLoad(item.images[0])}
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-dark-900">
                      <svg className="w-12 h-12 text-dark-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-white truncate">{item.name}</h3>
                      <p className="text-sm text-dark-400 truncate">by {item.owner.name}</p>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'available' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-2 text-dark-300 text-sm line-clamp-2">{item.description}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-medium text-primary-400">${item.price}</span>
                      <span className="text-sm text-dark-400">/{item.period}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Link
                        to={`/browse/${item._id}`}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-dark-700/50 rounded-lg hover:bg-primary-500 transition-colors"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowBookingModal(true);
                        }}
                        disabled={item.status !== 'available'}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Book Now
                      </button>
                    </div>
                    <button
                      onClick={() => handleEnquire(item)}
                      disabled={item.owner._id === user?._id}
                      className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {item.owner._id === user?._id ? 'Your Item' : 'Enquire'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Table View
          <div className="bg-dark-800/30 backdrop-blur-xl rounded-2xl border border-dark-700/50 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-300">Item</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-300">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-300">Price</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-dark-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {filteredItems.map((item, index) => (
                  <tr 
                    key={item._id} 
                    className="group hover:bg-dark-700/30 transition-colors"
                    style={{
                      animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-dark-900">
                          {item.images?.[0] ? (
                            <>
                              {!loadedImages[item.images[0]] && (
                                <div className="absolute inset-0 flex items-center justify-center bg-dark-900">
                                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                              <img
                                src={processedImages[item.images[0]] || item.images[0]}
                                alt={item.name}
                                className={`h-full w-full object-contain group-hover:scale-105 transition-all duration-300 ${
                                  loadedImages[item.images[0]] ? 'opacity-100' : 'opacity-0'
                                }`}
                                loading="lazy"
                                onLoad={() => handleImageLoad(item.images[0])}
                              />
                            </>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-dark-900">
                              <svg className="w-6 h-6 text-dark-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-sm text-dark-400">by {item.owner.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'available' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-dark-300 capitalize">{item.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-primary-400 font-medium">${item.price}</span>
                        <span className="text-sm text-dark-400">/{item.period}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/browse/${item._id}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-dark-700/50 rounded-lg hover:bg-primary-500 transition-colors"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowBookingModal(true);
                          }}
                          disabled={item.status !== 'available'}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Book
                        </button>
                        <button
                          onClick={() => handleEnquire(item)}
                          disabled={item.owner._id === user?._id}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {item.owner._id === user?._id ? 'Your Item' : 'Enquire'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Only render BookingModal if selectedItem exists */}
      {selectedItem && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
        />
      )}
    </DashboardLayout>
  );
}