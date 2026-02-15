import torch
import torch.nn as nn

class Model(nn.Module):
    def __init__(self, sequence_input_size, demographic_input_size=2, 
                 hidden_size=128, num_layers=2, dropout=0.4, num_outputs=4,
                 num_severity_classes=2, num_comparison_classes=10):
        super(Model, self).__init__()
        
        self.num_outputs = num_outputs
        self.demographic_input_size = demographic_input_size
        self.num_severity_classes = num_severity_classes
        self.num_comparison_classes = num_comparison_classes
        
        # Bidirectional LSTM for sequence processing (shared for all tasks)
        self.lstm = nn.LSTM(
            sequence_input_size, hidden_size, num_layers,
            batch_first=True, bidirectional=True, 
            dropout=dropout if num_layers > 1 else 0
        )
        
        # Attention mechanism (shared)
        self.attention = nn.Sequential(
            nn.Linear(hidden_size * 2, hidden_size),
            nn.Tanh(),
            nn.Linear(hidden_size, 1)
        )
        
        # Layer normalization
        self.layer_norm = nn.LayerNorm(hidden_size * 2)
        
        # Demographic feature processing
        self.demographic_fc = nn.Sequential(
            nn.Linear(demographic_input_size, 16),
            nn.ReLU(),
            nn.Dropout(dropout * 0.5)
        )
        
        # Shared representation layer (combines sequence + demographic)
        combined_size = hidden_size * 2 + 16
        self.shared_fc = nn.Sequential(
            nn.Linear(combined_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        # Task-specific heads
        # Output 0: Severity (classification with num_severity_classes)
        self.severity_head = nn.Linear(64, num_severity_classes)
        
        # Output 1: Social Affect (regression)
        self.social_affect_head = nn.Linear(64, 1)
        
        # Output 2: RRB (regression)
        self.rrb_head = nn.Linear(64, 1)
        
        # Output 3: Comparison Score (classification with num_comparison_classes)
        self.comparison_head = nn.Linear(64, num_comparison_classes)
    
    def forward(self, x_sequence, x_demographic, seq_lengths=None):
        # LSTM processing for sequence data
        lstm_out, _ = self.lstm(x_sequence)
        
        # Apply layer normalization
        lstm_out = self.layer_norm(lstm_out)
        
        # Attention mechanism
        attention_weights = self.attention(lstm_out)
        attention_weights = torch.softmax(attention_weights, dim=1)
        
        # Weighted sum of sequence features
        sequence_context = torch.sum(attention_weights * lstm_out, dim=1)
        
        # Process demographic features
        demographic_repr = self.demographic_fc(x_demographic)
        
        # Combine sequence and demographic representations
        combined = torch.cat([sequence_context, demographic_repr], dim=1)
        
        # Shared representation
        shared_repr = self.shared_fc(combined)
        
        # Task-specific predictions
        severity = self.severity_head(shared_repr)  # [batch, num_severity_classes]
        social_affect = self.social_affect_head(shared_repr)  # [batch, 1]
        rrb = self.rrb_head(shared_repr)  # [batch, 1]
        comparison = self.comparison_head(shared_repr)  # [batch, num_comparison_classes]
        
        # Return as dictionary for flexibility
        return {
            'severity': severity,
            'social_affect': social_affect,
            'rrb': rrb,
            'comparison': comparison
        }
