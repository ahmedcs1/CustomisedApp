function render(){
 const saved = localStorage.getItem('selectedLocation') || 'doha|Qatar';
 const parts = saved.split('|');
 document.getElementById('current').innerText =
   'الموقع الحالي: ' + parts[0] + ' • ' + parts[1];
 document.getElementById('city').value = saved;
}
function saveLocation(){
 const v = document.getElementById('city').value;
 localStorage.setItem('selectedLocation', v);
 render();
 alert('تم اعتماد الموقع بنجاح');
}
function resetLocation(){
 localStorage.setItem('selectedLocation', 'doha|Qatar');
 render();
 alert('تمت العودة إلى الدوحة');
}
render();
