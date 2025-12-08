// In-memory store for job applications
let applications = [];
let nextId = 1;

function addApplication(data) {
  const app = {
    id: nextId++,
    company: data.company,
    position: data.position,
    link: data.link || null,
    appliedDate: data.appliedDate,
    status: data.status,
    notes: data.notes || null,
    createdAt: new Date().toISOString()
  };
  applications.push(app);
  return app;
}

function getApplications() {
  return applications;
}

function getApplicationById(id) {
  return applications.find(app => app.id === parseInt(id));
}

function deleteApplication(id) {
  const index = applications.findIndex(app => app.id === parseInt(id));
  if (index > -1) {
    const deleted = applications.splice(index, 1);
    return deleted[0];
  }
  return null;
}

module.exports = {
  addApplication,
  getApplications,
  getApplicationById,
  deleteApplication
};
