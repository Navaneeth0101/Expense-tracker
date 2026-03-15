import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  Food: '#FF5722',
  Transport: '#2196F3',
  Shopping: '#9C27B0',
  Bills: '#FF9800',
  Subscriptions: '#4CAF50',
  Other: '#607D8B',
};

const screenWidth = Dimensions.get('window').width;

export default function Statistics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);

  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/expenses/category-breakdown`);
      const data = await response.json();
      setCategoryBreakdown(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatistics();
  };

  // Prepare data for bar chart
  const barData = categoryBreakdown.map((item) => ({
    value: item.amount,
    label: item.category.substring(0, 4),
    frontColor: CATEGORY_COLORS[item.category] || '#607D8B',
  }));

  // Prepare data for pie chart
  const pieData = categoryBreakdown.map((item) => ({
    value: item.percentage,
    color: CATEGORY_COLORS[item.category] || '#607D8B',
    text: `${item.percentage.toFixed(1)}%`,
  }));

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (categoryBreakdown.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="stats-chart-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Statistics Yet</Text>
        <Text style={styles.emptyText}>
          Add some expenses to see your spending statistics and insights.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Category Breakdown by Amount */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bar-chart" size={24} color="#4CAF50" />
          <Text style={styles.cardTitle}>Spending by Category</Text>
        </View>
        
        <View style={styles.chartContainer}>
          <BarChart
            data={barData}
            width={screenWidth - 80}
            height={220}
            barWidth={40}
            spacing={20}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#666', fontSize: 12 }}
            noOfSections={4}
            maxValue={Math.max(...barData.map(d => d.value)) * 1.2}
            isAnimated
            animationDuration={500}
          />
        </View>
      </View>

      {/* Pie Chart - Percentage Distribution */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="pie-chart" size={24} color="#4CAF50" />
          <Text style={styles.cardTitle}>Percentage Distribution</Text>
        </View>
        
        <View style={styles.pieChartContainer}>
          <PieChart
            data={pieData}
            donut
            radius={100}
            innerRadius={60}
            innerCircleColor="#f5f5f5"
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={styles.centerLabelText}>Total</Text>
                <Text style={styles.centerLabelValue}>100%</Text>
              </View>
            )}
            isAnimated
            animationDuration={500}
          />
        </View>
      </View>

      {/* Category List with Details */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="list" size={24} color="#4CAF50" />
          <Text style={styles.cardTitle}>Detailed Breakdown</Text>
        </View>

        {categoryBreakdown.map((item, index) => (
          <View key={index} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: CATEGORY_COLORS[item.category] || '#607D8B' },
                ]}
              />
              <View style={styles.categoryTextContainer}>
                <Text style={styles.categoryName}>{item.category}</Text>
                <Text style={styles.categoryPercentage}>{item.percentage.toFixed(1)}%</Text>
              </View>
            </View>
            <Text style={styles.categoryAmount}>₹{item.amount.toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Spending</Text>
          <Text style={styles.totalAmount}>
            ₹
            {categoryBreakdown
              .reduce((sum, item) => sum + item.amount, 0)
              .toFixed(2)}
          </Text>
        </View>
      </View>
    </ScrollView>
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
    padding: 32,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    color: '#333',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerLabelText: {
    fontSize: 14,
    color: '#666',
  },
  centerLabelValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 13,
    color: '#666',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
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
});
