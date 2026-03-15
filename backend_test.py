#!/usr/bin/env python3

import requests
import json
from datetime import datetime, timedelta
import sys
from typing import Dict, List, Any

# Backend URL from frontend environment
BACKEND_URL = "https://spend-tracker-363.preview.emergentagent.com/api"

class ExpenseTrackerTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.created_expenses = []
        self.created_subscriptions = []
    
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
    
    def cleanup_test_data(self):
        """Clean up test data created during tests"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created expenses
        for expense_id in self.created_expenses:
            try:
                response = self.session.delete(f"{BACKEND_URL}/expenses/{expense_id}")
                if response.status_code == 200:
                    print(f"   Deleted expense {expense_id}")
            except Exception as e:
                print(f"   Failed to delete expense {expense_id}: {e}")
        
        # Delete created subscriptions
        for subscription_id in self.created_subscriptions:
            try:
                response = self.session.delete(f"{BACKEND_URL}/subscriptions/{subscription_id}")
                if response.status_code == 200:
                    print(f"   Deleted subscription {subscription_id}")
            except Exception as e:
                print(f"   Failed to delete subscription {subscription_id}: {e}")
    
    def test_api_connection(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            if response.status_code == 200:
                data = response.json()
                self.log_test("API Connection", True, f"Response: {data}")
                return True
            else:
                self.log_test("API Connection", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Connection", False, f"Error: {str(e)}")
            return False
    
    def test_create_expense(self):
        """Test creating expenses"""
        # Test valid expense creation
        expense_data = {
            "amount": 250.75,
            "category": "Food",
            "date": datetime.now().isoformat(),
            "note": "Lunch at Italian restaurant"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/expenses", json=expense_data)
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ["id", "amount", "category", "date", "note"]):
                    self.created_expenses.append(data["id"])
                    self.log_test("Create Expense - Valid Data", True, f"Created expense ID: {data['id']}")
                else:
                    self.log_test("Create Expense - Valid Data", False, "Missing required fields in response")
            else:
                self.log_test("Create Expense - Valid Data", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Create Expense - Valid Data", False, f"Error: {str(e)}")
        
        # Test invalid data (missing required fields)
        invalid_expense = {"amount": 100}
        try:
            response = self.session.post(f"{BACKEND_URL}/expenses", json=invalid_expense)
            if response.status_code == 422:  # Validation error expected
                self.log_test("Create Expense - Invalid Data", True, "Properly rejected invalid data")
            else:
                self.log_test("Create Expense - Invalid Data", False, f"Should reject invalid data, got status: {response.status_code}")
        except Exception as e:
            self.log_test("Create Expense - Invalid Data", False, f"Error: {str(e)}")
    
    def test_get_expenses(self):
        """Test retrieving expenses"""
        try:
            response = self.session.get(f"{BACKEND_URL}/expenses")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Expenses", True, f"Retrieved {len(data)} expenses")
                    
                    # Test sorting (should be by date descending)
                    if len(data) > 1:
                        dates = [expense["date"] for expense in data]
                        sorted_dates = sorted(dates, reverse=True)
                        if dates == sorted_dates:
                            self.log_test("Expenses Sorted by Date", True, "Expenses properly sorted by date descending")
                        else:
                            self.log_test("Expenses Sorted by Date", False, "Expenses not sorted by date descending")
                else:
                    self.log_test("Get Expenses", False, "Response is not a list")
            else:
                self.log_test("Get Expenses", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Expenses", False, f"Error: {str(e)}")
    
    def test_delete_expense(self):
        """Test deleting expenses"""
        # Create an expense to delete
        expense_data = {
            "amount": 50.00,
            "category": "Transport",
            "date": datetime.now().isoformat(),
            "note": "Test expense for deletion"
        }
        
        try:
            # Create expense
            response = self.session.post(f"{BACKEND_URL}/expenses", json=expense_data)
            if response.status_code == 200:
                expense_id = response.json()["id"]
                
                # Delete expense
                delete_response = self.session.delete(f"{BACKEND_URL}/expenses/{expense_id}")
                if delete_response.status_code == 200:
                    self.log_test("Delete Expense - Valid ID", True, f"Deleted expense {expense_id}")
                else:
                    self.log_test("Delete Expense - Valid ID", False, f"Status: {delete_response.status_code}")
            else:
                self.log_test("Delete Expense - Valid ID", False, "Failed to create test expense")
        except Exception as e:
            self.log_test("Delete Expense - Valid ID", False, f"Error: {str(e)}")
        
        # Test deleting non-existent expense
        try:
            fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but non-existent
            response = self.session.delete(f"{BACKEND_URL}/expenses/{fake_id}")
            if response.status_code == 404:
                self.log_test("Delete Expense - Non-existent ID", True, "Properly returned 404 for non-existent expense")
            else:
                self.log_test("Delete Expense - Non-existent ID", False, f"Expected 404, got: {response.status_code}")
        except Exception as e:
            self.log_test("Delete Expense - Non-existent ID", False, f"Error: {str(e)}")
    
    def test_monthly_summary(self):
        """Test monthly summary calculation"""
        # Create test expenses for current month
        current_date = datetime.now().isoformat()
        test_expenses = [
            {"amount": 100, "category": "Food", "date": current_date, "note": "Test 1"},
            {"amount": 200, "category": "Shopping", "date": current_date, "note": "Test 2"}
        ]
        
        created_ids = []
        try:
            # Create test expenses
            for expense in test_expenses:
                response = self.session.post(f"{BACKEND_URL}/expenses", json=expense)
                if response.status_code == 200:
                    created_ids.append(response.json()["id"])
            
            self.created_expenses.extend(created_ids)
            
            # Get monthly summary
            response = self.session.get(f"{BACKEND_URL}/expenses/monthly-summary")
            if response.status_code == 200:
                data = response.json()
                required_fields = ["month", "year", "total_spent", "expense_count"]
                
                if all(field in data for field in required_fields):
                    # Check if current month and year are correct
                    now = datetime.now()
                    month_names = ["January", "February", "March", "April", "May", "June", 
                                 "July", "August", "September", "October", "November", "December"]
                    
                    if data["year"] == now.year and data["month"] == month_names[now.month - 1]:
                        self.log_test("Monthly Summary", True, f"Summary: {data['total_spent']} spent, {data['expense_count']} expenses")
                    else:
                        self.log_test("Monthly Summary", False, f"Wrong month/year: {data['month']} {data['year']}")
                else:
                    self.log_test("Monthly Summary", False, f"Missing required fields: {data}")
            else:
                self.log_test("Monthly Summary", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Monthly Summary", False, f"Error: {str(e)}")
    
    def test_category_breakdown(self):
        """Test category breakdown calculation"""
        try:
            response = self.session.get(f"{BACKEND_URL}/expenses/category-breakdown")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    if len(data) > 0:
                        # Check structure of breakdown items
                        first_item = data[0]
                        required_fields = ["category", "amount", "percentage"]
                        
                        if all(field in first_item for field in required_fields):
                            # Check if percentages add up to approximately 100%
                            total_percentage = sum(item["percentage"] for item in data)
                            if 99 <= total_percentage <= 101:  # Allow small rounding errors
                                self.log_test("Category Breakdown", True, f"Found {len(data)} categories, total percentage: {total_percentage}%")
                            else:
                                self.log_test("Category Breakdown", False, f"Percentages don't add up to 100%: {total_percentage}%")
                        else:
                            self.log_test("Category Breakdown", False, f"Missing required fields in breakdown item: {first_item}")
                    else:
                        self.log_test("Category Breakdown", True, "No expenses yet, empty breakdown returned")
                else:
                    self.log_test("Category Breakdown", False, "Response is not a list")
            else:
                self.log_test("Category Breakdown", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Category Breakdown", False, f"Error: {str(e)}")
    
    def test_create_subscription(self):
        """Test creating subscriptions"""
        # Test valid subscription creation
        subscription_data = {
            "name": "Netflix Premium",
            "amount": 199.00,
            "renewal_date": (datetime.now() + timedelta(days=15)).isoformat()
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/subscriptions", json=subscription_data)
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ["id", "name", "amount", "renewal_date"]):
                    self.created_subscriptions.append(data["id"])
                    self.log_test("Create Subscription - Valid Data", True, f"Created subscription ID: {data['id']}")
                else:
                    self.log_test("Create Subscription - Valid Data", False, "Missing required fields in response")
            else:
                self.log_test("Create Subscription - Valid Data", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Create Subscription - Valid Data", False, f"Error: {str(e)}")
        
        # Test invalid data (missing required fields)
        invalid_subscription = {"name": "Test"}
        try:
            response = self.session.post(f"{BACKEND_URL}/subscriptions", json=invalid_subscription)
            if response.status_code == 422:  # Validation error expected
                self.log_test("Create Subscription - Invalid Data", True, "Properly rejected invalid data")
            else:
                self.log_test("Create Subscription - Invalid Data", False, f"Should reject invalid data, got status: {response.status_code}")
        except Exception as e:
            self.log_test("Create Subscription - Invalid Data", False, f"Error: {str(e)}")
    
    def test_get_subscriptions(self):
        """Test retrieving subscriptions"""
        try:
            response = self.session.get(f"{BACKEND_URL}/subscriptions")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Subscriptions", True, f"Retrieved {len(data)} subscriptions")
                    
                    # Test sorting (should be by renewal_date ascending)
                    if len(data) > 1:
                        dates = [sub["renewal_date"] for sub in data]
                        sorted_dates = sorted(dates)
                        if dates == sorted_dates:
                            self.log_test("Subscriptions Sorted by Renewal Date", True, "Subscriptions properly sorted by renewal date ascending")
                        else:
                            self.log_test("Subscriptions Sorted by Renewal Date", False, "Subscriptions not sorted by renewal date ascending")
                else:
                    self.log_test("Get Subscriptions", False, "Response is not a list")
            else:
                self.log_test("Get Subscriptions", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Subscriptions", False, f"Error: {str(e)}")
    
    def test_delete_subscription(self):
        """Test deleting subscriptions"""
        # Create a subscription to delete
        subscription_data = {
            "name": "Test Subscription for Deletion",
            "amount": 99.99,
            "renewal_date": datetime.now().isoformat()
        }
        
        try:
            # Create subscription
            response = self.session.post(f"{BACKEND_URL}/subscriptions", json=subscription_data)
            if response.status_code == 200:
                subscription_id = response.json()["id"]
                
                # Delete subscription
                delete_response = self.session.delete(f"{BACKEND_URL}/subscriptions/{subscription_id}")
                if delete_response.status_code == 200:
                    self.log_test("Delete Subscription - Valid ID", True, f"Deleted subscription {subscription_id}")
                else:
                    self.log_test("Delete Subscription - Valid ID", False, f"Status: {delete_response.status_code}")
            else:
                self.log_test("Delete Subscription - Valid ID", False, "Failed to create test subscription")
        except Exception as e:
            self.log_test("Delete Subscription - Valid ID", False, f"Error: {str(e)}")
        
        # Test deleting non-existent subscription
        try:
            fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but non-existent
            response = self.session.delete(f"{BACKEND_URL}/subscriptions/{fake_id}")
            if response.status_code == 404:
                self.log_test("Delete Subscription - Non-existent ID", True, "Properly returned 404 for non-existent subscription")
            else:
                self.log_test("Delete Subscription - Non-existent ID", False, f"Expected 404, got: {response.status_code}")
        except Exception as e:
            self.log_test("Delete Subscription - Non-existent ID", False, f"Error: {str(e)}")
    
    def test_high_expense_months(self):
        """Test high expense month detection"""
        # Create multiple subscriptions for the same month to trigger high expense detection
        base_date = datetime.now().replace(day=15)  # Mid-month to avoid edge cases
        
        subscriptions = [
            {"name": "Disney Plus", "amount": 199.00, "renewal_date": base_date.isoformat()},
            {"name": "Spotify Premium", "amount": 119.00, "renewal_date": base_date.isoformat()},
        ]
        
        created_ids = []
        try:
            # Create test subscriptions
            for subscription in subscriptions:
                response = self.session.post(f"{BACKEND_URL}/subscriptions", json=subscription)
                if response.status_code == 200:
                    created_ids.append(response.json()["id"])
            
            self.created_subscriptions.extend(created_ids)
            
            # Get high expense months
            response = self.session.get(f"{BACKEND_URL}/subscriptions/high-expense-months")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Should find at least one month with multiple subscriptions
                    found_high_expense = False
                    for month_data in data:
                        required_fields = ["month", "year", "subscription_count", "estimated_cost", "subscription_names"]
                        if all(field in month_data for field in required_fields):
                            if month_data["subscription_count"] >= 2:
                                found_high_expense = True
                                break
                    
                    if found_high_expense:
                        self.log_test("High Expense Month Detection", True, f"Found {len(data)} high expense months")
                    else:
                        self.log_test("High Expense Month Detection", False, "No high expense months detected despite creating multiple subscriptions")
                else:
                    self.log_test("High Expense Month Detection", False, "Response is not a list")
            else:
                self.log_test("High Expense Month Detection", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("High Expense Month Detection", False, f"Error: {str(e)}")
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        # Test with invalid expense ID format
        try:
            response = self.session.delete(f"{BACKEND_URL}/expenses/invalid_id")
            if response.status_code in [400, 422]:
                self.log_test("Invalid Expense ID Format", True, "Properly handled invalid ID format")
            else:
                self.log_test("Invalid Expense ID Format", False, f"Expected error status, got: {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Expense ID Format", False, f"Error: {str(e)}")
        
        # Test with invalid subscription ID format  
        try:
            response = self.session.delete(f"{BACKEND_URL}/subscriptions/invalid_id")
            if response.status_code in [400, 422]:
                self.log_test("Invalid Subscription ID Format", True, "Properly handled invalid ID format")
            else:
                self.log_test("Invalid Subscription ID Format", False, f"Expected error status, got: {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Subscription ID Format", False, f"Error: {str(e)}")
        
        # Test empty data for expenses
        try:
            response = self.session.post(f"{BACKEND_URL}/expenses", json={})
            if response.status_code == 422:
                self.log_test("Empty Expense Data", True, "Properly rejected empty data")
            else:
                self.log_test("Empty Expense Data", False, f"Expected 422, got: {response.status_code}")
        except Exception as e:
            self.log_test("Empty Expense Data", False, f"Error: {str(e)}")
        
        # Test empty data for subscriptions
        try:
            response = self.session.post(f"{BACKEND_URL}/subscriptions", json={})
            if response.status_code == 422:
                self.log_test("Empty Subscription Data", True, "Properly rejected empty data")
            else:
                self.log_test("Empty Subscription Data", False, f"Expected 422, got: {response.status_code}")
        except Exception as e:
            self.log_test("Empty Subscription Data", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🧪 Starting Expense Tracker Backend API Tests")
        print(f"🔗 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test API connection first
        if not self.test_api_connection():
            print("❌ Cannot connect to API. Stopping tests.")
            return self.generate_summary()
        
        # Run all test suites
        print("\n📝 Testing Expense Endpoints...")
        self.test_create_expense()
        self.test_get_expenses()
        self.test_delete_expense()
        self.test_monthly_summary()
        self.test_category_breakdown()
        
        print("\n💳 Testing Subscription Endpoints...")
        self.test_create_subscription()
        self.test_get_subscriptions()
        self.test_delete_subscription()
        self.test_high_expense_months()
        
        print("\n🔍 Testing Edge Cases...")
        self.test_edge_cases()
        
        # Cleanup
        self.cleanup_test_data()
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = [t for t in self.test_results if t["passed"]]
        failed_tests = [t for t in self.test_results if not t["passed"]]
        
        print(f"✅ Passed: {len(passed_tests)}/{len(self.test_results)}")
        print(f"❌ Failed: {len(failed_tests)}/{len(self.test_results)}")
        
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        print("\n✅ PASSED TESTS:")
        for test in passed_tests:
            print(f"   • {test['test']}")
        
        return {
            "total_tests": len(self.test_results),
            "passed_tests": len(passed_tests),
            "failed_tests": len(failed_tests),
            "failed_test_details": failed_tests,
            "all_tests_passed": len(failed_tests) == 0
        }

if __name__ == "__main__":
    tester = ExpenseTrackerTester()
    summary = tester.run_all_tests()
    
    # Exit with appropriate code
    if summary["all_tests_passed"]:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n💥 {summary['failed_tests']} tests failed!")
        sys.exit(1)