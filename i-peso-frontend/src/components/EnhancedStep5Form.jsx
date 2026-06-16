import React, { useState, useCallback } from 'react'
import { AlertCircle, ChevronDown, AlertTriangle, TrendingUp, Brain } from 'lucide-react'

/**
 * Enhanced Education & Skills Form - Step 5
 * Improvements:
 * - Proficiency levels for skills
 * - Better skill search with suggestions
 * - Skill gap analysis
 * - Duplicate detection warning
 * - Progressive disclosure of advanced options
 * - Better UX with inline help
 */

export default function EnhancedStep5Form({
  form,
  errors,
  onChange,
  onAddEducation,
  onRemoveEducation,
  onUpdateEducation,
  skillSuggestions = [],
  onSkillsAnalysis,
}) {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState({})
  const [skillDuplicateWarnings, setSkillDuplicateWarnings] = useState({})
  const [selectedEducationIndex, setSelectedEducationIndex] = useState(null)

  // Proficiency level options
  const PROFICIENCY_LEVELS = [
    { value: 'beginner', label: 'Beginner', description: 'Just learning this skill' },
    { value: 'intermediate', label: 'Intermediate', description: 'Can use competently' },
    { value: 'advanced', label: 'Advanced', description: 'Very proficient' },
    { value: 'expert', label: 'Expert', description: 'Master level knowledge' },
  ]

  // Detect potential skill duplicates
  const detectDuplicates = useCallback((skills, newSkill) => {
    const normalized = newSkill.toLowerCase().trim()
    const duplicates = skills.filter((skill) => {
      const existingNorm = skill.toLowerCase().trim()
      return normalized === existingNorm || 
             (normalized.includes(existingNorm) || existingNorm.includes(normalized))
    })
    return duplicates
  }, [])

  // Handle skill add with duplicate check
  const handleAddSkill = (skillType, newSkill, proficiency = 'intermediate') => {
    const currentSkills = form[skillType] ?? []
    const duplicates = detectDuplicates(
      currentSkills.map((s) => (typeof s === 'object' ? s.name : s)),
      newSkill
    )

    if (duplicates.length > 0) {
      setSkillDuplicateWarnings((prev) => ({
        ...prev,
        [skillType]: {
          skill: newSkill,
          duplicates,
        },
      }))
      return
    }

    // Clear warning if resolved
    setSkillDuplicateWarnings((prev) => {
      const updated = { ...prev }
      delete updated[skillType]
      return updated
    })

    const skillsArray = currentSkills || []
    const updated = [
      ...skillsArray,
      {
        name: newSkill,
        proficiency,
        yearsOfExperience: 0,
      },
    ]
    onChange({ target: { name: skillType, value: updated } })
  }

  // Remove skill
  const handleRemoveSkill = (skillType, index) => {
    const skillsArray = form[skillType] ?? []
    const updated = skillsArray.filter((_, i) => i !== index)
    onChange({ target: { name: skillType, value: updated } })
  }

  // Update skill proficiency
  const handleUpdateSkillProficiency = (skillType, index, proficiency) => {
    const skillsArray = form[skillType] ?? []
    const updated = [...skillsArray]
    updated[index] = {
      ...(typeof updated[index] === 'object' ? updated[index] : { name: updated[index] }),
      proficiency,
    }
    onChange({ target: { name: skillType, value: updated } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ─────────────────────────────────────────────────────────────────────────────*/}
      {/* SECTION: EDUCATION */}
      {/* ─────────────────────────────────────────────────────────────────────────────*/}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>🎓</span>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Educational Background
          </h3>
        </div>

        <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: '0 0 8px', fontWeight: '600' }}>
            💡 Tip: Add your education level and course to improve job matching
          </p>
          <p style={{ fontSize: '12px', color: '#0369a1', margin: 0 }}>
            Including GPA and academic honors (optional) can strengthen your profile for premium positions.
          </p>
        </div>

        {/* Education entries with enhanced form */}
        <div style={{ display: 'grid', gap: '12px' }}>
          {form.educations?.map((edu, i) => (
            <div
              key={i}
              style={{
                border: selectedEducationIndex === i ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px',
                backgroundColor: selectedEducationIndex === i ? '#f0f9ff' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setSelectedEducationIndex(selectedEducationIndex === i ? null : i)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                    {edu.level ? edu.level.replace(/_/g, ' ').toUpperCase() : 'Select level'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                    {edu.course_strand || 'No course specified'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveEducation('educations', i)
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#dc2626',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>

              {/* Expanded form */}
              {selectedEducationIndex === i && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  {/* Level selection */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px', display: 'block' }}>
                      Level
                    </label>
                    <select
                      value={edu.level || ''}
                      onChange={(e) => onUpdateEducation('educations', i, { level: e.target.value })}
                      style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">Select level</option>
                      <option value="elementary">Elementary</option>
                      <option value="secondary_non_k12">High School</option>
                      <option value="senior_high_strand">Senior High School</option>
                      <option value="tertiary">College/University</option>
                      <option value="graduate_studies">Graduate Studies</option>
                    </select>
                  </div>

                  {/* Course/Program */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px', display: 'block' }}>
                      Course / Program / Strand
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Bachelor of Science in Information Technology"
                      value={edu.course_strand || ''}
                      onChange={(e) => onUpdateEducation('educations', i, { course_strand: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                    />
                  </div>

                  {/* GPA (optional) */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px', display: 'block' }}>
                      GPA (Optional, 0.0 - 4.0)
                    </label>
                    <input
                      type="number"
                      placeholder="3.75"
                      min="0"
                      max="4"
                      step="0.01"
                      value={edu.gpa || ''}
                      onChange={(e) => onUpdateEducation('educations', i, { gpa: e.target.value || null })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                    />
                  </div>

                  {/* Year completed */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px', display: 'block' }}>
                      Year Completed
                    </label>
                    <input
                      type="number"
                      placeholder="2023"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={edu.year_graduated || ''}
                      onChange={(e) => onUpdateEducation('educations', i, { year_graduated: e.target.value || null })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onAddEducation('educations', { level: '', course_strand: '', year_graduated: null, gpa: null })}
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#1d4ed8',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          + Add Education Level
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────*/}
      {/* SECTION: SKILLS WITH PROFICIENCY */}
      {/* ─────────────────────────────────────────────────────────────────────────────*/}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>💼</span>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Skills & Competencies
          </h3>
        </div>

        {/* Skills Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { type: 'dole_skills', label: 'DOLE Skills', color: '#3b82f6' },
            { type: 'technical_skills', label: 'Hard Skills', color: '#8b5cf6' },
            { type: 'soft_skills', label: 'Soft Skills', color: '#10b981' },
          ].map((category) => (
            <div
              key={category.type}
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: category.color + '15',
                border: `1px solid ${category.color}30`,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{category.label}</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: category.color, margin: '4px 0 0' }}>
                {form[category.type]?.length ?? 0}
              </p>
            </div>
          ))}
        </div>

        {/* Skill Suggestions */}
        {skillSuggestions && skillSuggestions.length > 0 && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <TrendingUp size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#d97706', margin: '0 0 4px' }}>
                Recommended Skills
              </p>
              <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
                {skillSuggestions.slice(0, 3).join(', ')}
                {skillSuggestions.length > 3 && ` +${skillSuggestions.length - 3} more`}
              </p>
            </div>
          </div>
        )}

        {/* Hard Skills Section */}
        <SkillCategorySection
          title="🔧 Hard Skills"
          description="Technical and professional skills you can demonstrate"
          skills={form.technical_skills ?? []}
          type="technical_skills"
          proficiencyLevels={PROFICIENCY_LEVELS}
          onAdd={handleAddSkill}
          onRemove={handleRemoveSkill}
          onUpdateProficiency={handleUpdateSkillProficiency}
          duplicateWarning={skillDuplicateWarnings.technical_skills}
          color="#8b5cf6"
        />

        {/* Soft Skills Section */}
        <SkillCategorySection
          title="🤝 Soft Skills"
          description="Interpersonal and behavioral competencies"
          skills={form.soft_skills ?? []}
          type="soft_skills"
          proficiencyLevels={PROFICIENCY_LEVELS}
          onAdd={handleAddSkill}
          onRemove={handleRemoveSkill}
          onUpdateProficiency={handleUpdateSkillProficiency}
          duplicateWarning={skillDuplicateWarnings.soft_skills}
          color="#10b981"
        />
      </div>
    </div>
  )
}

/**
 * Reusable Skill Category Section Component
 */
function SkillCategorySection({
  title,
  description,
  skills,
  type,
  proficiencyLevels,
  onAdd,
  onRemove,
  onUpdateProficiency,
  duplicateWarning,
  color,
}) {
  const [newSkill, setNewSkill] = useState('')
  const [newProficiency, setNewProficiency] = useState('intermediate')

  const handleAdd = () => {
    if (newSkill.trim()) {
      onAdd(type, newSkill, newProficiency)
      setNewSkill('')
      setNewProficiency('intermediate')
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        border: `1px solid ${color}20`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px' }}>
        {title}
      </h4>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px' }}>
        {description}
      </p>

      {/* Duplicate Warning */}
      {duplicateWarning && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '10px',
          marginBottom: '12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={16} style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626', margin: 0 }}>
              Duplicate skill?
            </p>
            <p style={{ fontSize: '11px', color: '#991b1b', margin: '2px 0 0' }}>
              You already have: {duplicateWarning.duplicates.join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Skills List */}
      <div style={{ marginBottom: '12px', display: 'grid', gap: '8px' }}>
        {skills.map((skill, index) => {
          const skillName = typeof skill === 'object' ? skill.name : skill
          const proficiency = typeof skill === 'object' ? skill.proficiency : 'intermediate'
          const profLabel = proficiencyLevels.find((p) => p.value === proficiency)?.label || 'Intermediate'

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fff',
                border: `1px solid ${color}30`,
                borderRadius: '8px',
                padding: '10px',
              }}
            >
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  {skillName}
                </p>
                <select
                  value={proficiency}
                  onChange={(e) => onUpdateProficiency(type, index, e.target.value)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 6px',
                    marginTop: '4px',
                    border: `1px solid ${color}40`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {proficiencyLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => onRemove(type, index)}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  color: '#6b7280',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Remove
              </button>
            </div>
          )
        })}
      </div>

      {/* Add new skill */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder={`Add a ${type === 'technical_skills' ? 'hard' : 'soft'} skill...`}
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '13px',
            border: `1px solid ${color}40`,
            borderRadius: '6px',
            outline: 'none',
          }}
        />
        <select
          value={newProficiency}
          onChange={(e) => setNewProficiency(e.target.value)}
          style={{
            padding: '8px 10px',
            fontSize: '12px',
            border: `1px solid ${color}40`,
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          {proficiencyLevels.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            color: '#fff',
            backgroundColor: color,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
