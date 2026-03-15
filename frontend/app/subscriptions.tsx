import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Subscription {
  id: string;
  name: string;
  amount: number;
  renewal_date: string;
  created_at: string;
}

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSubscription, setNewSubscription] = useState({
    name: '',
    amount: '',
    renewal_date: '',
  });

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscriptions`);
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions();
  };

  const handleAddSubscription = async () => {
    if (!newSubscription.name || !newSubscription.amount || !newSubscription.renewal_date) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }

    if (isNaN(parseFloat(newSubscription.amount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid number.');
      return;
    }

    // Simple date validation (DD format)
    const day = parseInt(newSubscription.renewal_date);
    if (isNaN(day) || day < 1 || day > 31) {
      Alert.alert('Invalid Date', 'Please enter a day between 1 and 31.');
      return;
    }

    try {
      // Create a date for next renewal (this month or next month)
      const now = new Date();
      const currentDay = now.getDate();
      const renewalDate = new Date(now.getFullYear(), now.getMonth(), day);
      
      // If the day has passed this month, set to next month
      if (day < currentDay) {
        renewalDate.setMonth(renewalDate.getMonth() + 1);
      }

      const response = await fetch(`${BACKEND_URL}/api/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSubscription.name,
          amount: parseFloat(newSubscription.amount),
          renewal_date: renewalDate.toISOString(),
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Subscription added successfully!');
        setModalVisible(false);
        setNewSubscription({ name: '', amount: '', renewal_date: '' });
        fetchSubscriptions();
      } else {
        Alert.alert('Error', 'Failed to add subscription.');
      }
    } catch (error) {
      console.error('Error adding subscription:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handleDelete = (subscription: Subscription) => {
    Alert.alert(
      'Delete Subscription',
      `Are you sure you want to delete ${subscription.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/subscriptions/${subscription.id}`, {
                method: 'DELETE',
              });
              fetchSubscriptions();
            } catch (error) {
              console.error('Error deleting subscription:', error);
              Alert.alert('Error', 'Failed to delete subscription.');
            }
          },
        },
      ]
    );
  };

  const renderSubscriptionItem = ({ item }: { item: Subscription }) => {
    let renewalDate;
    try {
      renewalDate = parseISO(item.renewal_date);
    } catch {
      renewalDate = new Date();
    }

    return (
      <View style={styles.subscriptionItem}>
        <View style={styles.iconContainer}>
          <Ionicons name="repeat" size={24} color="#4CAF50" />
        </View>
        <View style={styles.subscriptionDetails}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.nameText}>{item.name}</Text>
            <Text style={styles.amountText}>₹{item.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.renewalInfo}>
            <Ionicons name="calendar" size={14} color="#666" />
            <Text style={styles.renewalText}>Renews on {format(renewalDate, 'MMM d, yyyy')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {subscriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="repeat-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Subscriptions</Text>
          <Text style={styles.emptyText}>
            Track your recurring payments like Netflix, Spotify, and more.
          </Text>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          renderItem={renderSubscriptionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add Subscription Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Subscription</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subscription Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Netflix, Spotify"
                value={newSubscription.name}
                onChangeText={(text) => setNewSubscription({ ...newSubscription, name: text })}
                placeholderTextColor="#ccc"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={newSubscription.amount}
                onChangeText={(text) => setNewSubscription({ ...newSubscription, amount: text })}
                keyboardType="decimal-pad"
                placeholderTextColor="#ccc"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Renewal Day (1-31)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 15"
                value={newSubscription.renewal_date}
                onChangeText={(text) => setNewSubscription({ ...newSubscription, renewal_date: text })}
                keyboardType="number-pad"
                placeholderTextColor="#ccc"
              />
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddSubscription}
            >
              <Text style={styles.addButtonText}>Add Subscription</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 88,
  },
  subscriptionItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionDetails: {
    flex: 1,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  renewalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  renewalText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
