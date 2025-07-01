#!/usr/bin/env python3
"""
Sveobuhvatan test za Session Management funkcionalnosti
Testira sve endpoint-e u real režimu: Frontend -> Backend -> Supabase
"""

import requests
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List

class SessionManagementIntegrationTest:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.test_session_id = f"test-session-{uuid.uuid4().hex[:8]}"
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Loguje rezultat testa"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def test_backend_health(self) -> bool:
        """Testira da li je backend dostupan"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy" and data.get("supabase_connected"):
                    self.log_test("Backend Health Check", True, "Backend i Supabase su dostupni")
                    return True
                else:
                    self.log_test("Backend Health Check", False, f"Backend nije zdrav: {data}")
                    return False
            else:
                self.log_test("Backend Health Check", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Backend Health Check", False, f"Greška: {str(e)}")
            return False
    
    def test_get_sessions(self) -> bool:
        """Testira dohvatanje sesija"""
        try:
            response = requests.get(f"{self.base_url}/chat/sessions", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success" and "sessions" in data:
                    session_count = len(data["sessions"])
                    self.log_test("Get Sessions", True, f"Dohvaćeno {session_count} sesija")
                    return True
                else:
                    self.log_test("Get Sessions", False, f"Neispravan odgovor: {data}")
                    return False
            else:
                self.log_test("Get Sessions", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get Sessions", False, f"Greška: {str(e)}")
            return False
    
    def test_rename_session(self) -> bool:
        """Testira preimenovanje sesije"""
        try:
            new_name = f"Test Sesija {uuid.uuid4().hex[:4]}"
            response = requests.put(
                f"{self.base_url}/chat/sessions/{self.test_session_id}/rename?name={new_name}",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Rename Session", True, f"Sesija preimenovana u: {new_name}")
                    return True
                else:
                    self.log_test("Rename Session", False, f"Neispravan odgovor: {data}")
                    return False
            else:
                self.log_test("Rename Session", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Rename Session", False, f"Greška: {str(e)}")
            return False
    
    def test_update_categories(self) -> bool:
        """Testira ažuriranje kategorija"""
        try:
            categories = ["Važno", "Test", "Integracija"]
            response = requests.put(
                f"{self.base_url}/chat/sessions/{self.test_session_id}/categories",
                json=categories,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Update Categories", True, f"Kategorije ažurirane: {categories}")
                    return True
                else:
                    self.log_test("Update Categories", False, f"Neispravan odgovor: {data}")
                    return False
            else:
                self.log_test("Update Categories", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Update Categories", False, f"Greška: {str(e)}")
            return False
    
    def test_archive_session(self) -> bool:
        """Testira arhiviranje sesije"""
        try:
            response = requests.post(
                f"{self.base_url}/chat/sessions/{self.test_session_id}/archive",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Archive Session", True, "Sesija arhivirana")
                    return True
                else:
                    self.log_test("Archive Session", False, f"Neispravan odgovor: {data}")
                    return False
            else:
                self.log_test("Archive Session", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Archive Session", False, f"Greška: {str(e)}")
            return False
    
    def test_restore_session(self) -> bool:
        """Testira vraćanje sesije iz arhive"""
        try:
            response = requests.post(
                f"{self.base_url}/chat/sessions/{self.test_session_id}/restore",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Restore Session", True, "Sesija vraćena iz arhive")
                    return True
                else:
                    self.log_test("Restore Session", False, f"Neispravan odgovor: {data}")
                    return False
            else:
                self.log_test("Restore Session", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Restore Session", False, f"Greška: {str(e)}")
            return False
    
    def test_create_share_link(self) -> bool:
        """Testira kreiranje share link-a"""
        try:
            response = requests.post(
                f"{self.base_url}/chat/sessions/{self.test_session_id}/share?permissions=read&expires_in=7d",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success" and "share_token" in data:
                    share_token = data["share_token"]
                    self.log_test("Create Share Link", True, f"Share token kreiran: {share_token[:16]}...")
                    return share_token
                else:
                    self.log_test("Create Share Link", False, f"Neispravan odgovor: {data}")
                    return False
            else:
                self.log_test("Create Share Link", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Create Share Link", False, f"Greška: {str(e)}")
            return False
    
    def test_revoke_share_link(self, share_token: str) -> bool:
        """Testira opozivanje share link-a"""
        try:
            response = requests.delete(
                f"{self.base_url}/chat/sessions/share/{share_token}",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Revoke Share Link", True, "Share link opozvan")
                    return True
                else:
                    self.log_test("Revoke Share Link", False, f"Neispravan odgovor: {data}")
                    return False
            else:
                self.log_test("Revoke Share Link", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Revoke Share Link", False, f"Greška: {str(e)}")
            return False
    
    def test_export_session(self) -> bool:
        """Testira export sesije"""
        try:
            response = requests.get(
                f"{self.base_url}/chat/sessions/{self.test_session_id}/export",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success" and "export_data" in data:
                    export_data = data["export_data"]
                    message_count = export_data.get("total_messages", 0)
                    self.log_test("Export Session", True, f"Export uspešan, {message_count} poruka")
                    return True
                else:
                    self.log_test("Export Session", False, f"Neispravan odgovor: {data}")
                    return False
            else:
                self.log_test("Export Session", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Export Session", False, f"Greška: {str(e)}")
            return False
    
    def test_delete_session(self) -> bool:
        """Testira brisanje sesije"""
        try:
            response = requests.delete(
                f"{self.base_url}/chat/session/{self.test_session_id}",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_test("Delete Session", True, "Sesija obrisana")
                    return True
                else:
                    self.log_test("Delete Session", False, f"Neispravan odgovor: {data}")
                    return False
            else:
                self.log_test("Delete Session", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Delete Session", False, f"Greška: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Pokreće sve testove"""
        print("🚀 POKRETANJE SVEOBUHVATNOG TESTA SESSION MANAGEMENT-A")
        print("=" * 60)
        
        # Test 1: Backend Health
        if not self.test_backend_health():
            return {"success": False, "message": "Backend nije dostupan"}
        
        # Test 2: Get Sessions
        self.test_get_sessions()
        
        # Test 3: Rename Session
        self.test_rename_session()
        
        # Test 4: Update Categories
        self.test_update_categories()
        
        # Test 5: Archive Session
        self.test_archive_session()
        
        # Test 6: Restore Session
        self.test_restore_session()
        
        # Test 7: Create Share Link
        share_token = self.test_create_share_link()
        
        # Test 8: Revoke Share Link (ako je kreiran)
        if share_token:
            self.test_revoke_share_link(share_token)
        
        # Test 9: Export Session
        self.test_export_session()
        
        # Test 10: Delete Session
        self.test_delete_session()
        
        # Izračunaj rezultate
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print("\n" + "=" * 60)
        print("📊 REZULTATI TESTA")
        print("=" * 60)
        print(f"Ukupno testova: {total_tests}")
        print(f"✅ Uspeli: {passed_tests}")
        print(f"❌ Neuspešni: {failed_tests}")
        print(f"📈 Uspešnost: {(passed_tests/total_tests)*100:.1f}%")
        
        # Detaljni rezultati
        print("\n📋 DETALJNI REZULTATI:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['details']}")
        
        # Sačuvaj rezultate u fajl
        import os
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_dir = "tests/data/results"
        os.makedirs(results_dir, exist_ok=True)
        results_file = f"{results_dir}/session_management_test_{timestamp}.json"
        
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump({
                "test_session_id": self.test_session_id,
                "timestamp": datetime.now().isoformat(),
                "summary": {
                    "total_tests": total_tests,
                    "passed_tests": passed_tests,
                    "failed_tests": failed_tests,
                    "success_rate": (passed_tests/total_tests)*100
                },
                "results": self.test_results
            }, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Rezultati sačuvani u: {results_file}")
        
        return {
            "success": failed_tests == 0,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": (passed_tests/total_tests)*100,
            "results_file": results_file
        }

def main():
    """Glavna funkcija za pokretanje testa"""
    test = SessionManagementIntegrationTest()
    result = test.run_all_tests()
    
    if result["success"]:
        print("\n🎉 SVI TESTOVI SU PROŠLI! Session Management je potpuno funkcionalan!")
        exit(0)
    else:
        print(f"\n⚠️ {result['failed_tests']} testova nije prošlo. Proverite rezultate.")
        exit(1)

if __name__ == "__main__":
    main() 